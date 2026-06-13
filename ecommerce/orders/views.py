from django.db import transaction
from rest_framework import viewsets, mixins, permissions, filters, status as http_status
from rest_framework.decorators import action
from rest_framework.response import Response

from payments.models import Payment
from .models import Order, OrderItem
from .serializers import (
    OrderSerializer,
    OrderCreateSerializer,
    OrderItemSerializer,
    OrderStatusSerializer,
)


class OrderViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """訂單：可建立、查列表、查單筆。使用者只看得到自己的訂單，管理員看得到全部。"""

    queryset = Order.objects.all()  # 給 router 推導名稱用；實際資料以 get_queryset() 為準
    permission_classes = [permissions.IsAuthenticated]

    # 後台可用 ?search=客人帳號 找訂單
    filter_backends = [filters.SearchFilter]
    search_fields = ["user__username"]

    def get_queryset(self):
        # drf_yasg 產生文件時會用匿名假請求，先擋掉避免 filter 出錯
        if getattr(self, "swagger_fake_view", False):
            return Order.objects.none()

        user = self.request.user
        qs = Order.objects.all().order_by("-created_at")
        if not user.is_staff:
            qs = qs.filter(user=user)

        # ?status=paid 之類的狀態篩選（後台常要「只看待出貨」）
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return OrderCreateSerializer
        return OrderSerializer

    def perform_create(self, serializer):
        # 訂單一定綁在登入者身上，前端不需要（也不能）自己指定 user
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["patch"], url_path="status",
            permission_classes=[permissions.IsAdminUser])
    def update_status(self, request, pk=None):
        """PATCH /api/orders/{id}/status/ — 管理員更新訂單狀態（出貨、完成）。"""
        order = self.get_object()
        serializer = OrderStatusSerializer(order, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(OrderSerializer(order, context={"request": request}).data)

    @action(detail=True, methods=["post"],
            permission_classes=[permissions.IsAuthenticated])
    def cancel(self, request, pk=None):
        """POST /api/orders/{id}/cancel/ — 取消訂單並回補庫存。
        一般使用者只能取消自己「未付款」的訂單；管理員可取消未付款或已付款的。"""
        order = self.get_object()  # 非管理員只取得到自己的訂單，否則 404
        is_admin = request.user.is_staff

        # 已出貨／已完成／已取消的不能再取消
        if order.status in (Order.Status.SHIPPED, Order.Status.COMPLETED, Order.Status.CANCELLED):
            return Response(
                {"detail": f"「{order.get_status_display()}」的訂單不能取消。"},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
        # 一般使用者只能取消尚未付款的
        if not is_admin and order.status != Order.Status.PENDING:
            return Response(
                {"detail": "只能取消尚未付款的訂單，已付款請聯絡客服。"},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            # 1) 回補庫存
            for item in order.items.select_related("product"):
                product = item.product
                product.stock += item.quantity
                product.save()
            # 2) 已付款 → mock 退款
            payment = Payment.objects.filter(order=order).first()
            if payment and payment.status == Payment.Status.SUCCESS:
                payment.status = Payment.Status.REFUNDED
                payment.save()
            # 3) 訂單轉為已取消
            order.status = Order.Status.CANCELLED
            order.save()

        return Response(OrderSerializer(order, context={"request": request}).data)


class OrderItemViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """訂單項目唯讀：項目是建立訂單時一起產生的，這裡只開放查詢。"""

    queryset = OrderItem.objects.all()  # 給 router 推導名稱用
    serializer_class = OrderItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return OrderItem.objects.none()

        user = self.request.user
        qs = OrderItem.objects.select_related("product", "order").all()
        if not user.is_staff:
            qs = qs.filter(order__user=user)
        return qs
