import stripe

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, mixins, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from orders.models import Order
from .models import Payment
from .serializers import PaymentSerializer, PaymentCreateSerializer


class PaymentViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """付款：可發起付款、查列表、查單筆。付款一旦成立不開放修改/刪除。
    使用者只看得到自己的付款，管理員看得到全部。"""

    queryset = Payment.objects.all()  # 給 router 推導名稱用
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Payment.objects.none()

        user = self.request.user
        qs = Payment.objects.select_related("order").all().order_by("-created_at")
        if not user.is_staff:
            qs = qs.filter(user=user)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return PaymentCreateSerializer
        return PaymentSerializer

    @action(detail=False, methods=["post"], url_path="create-intent")
    def create_intent(self, request):
        """前端發起 Stripe 付款前，先跟後端要一張 PaymentIntent，拿回 client_secret。
        實際扣款由前端用 Stripe.js 確認；成功後再呼叫 POST /payments/ 寫入紀錄。"""
        order = get_object_or_404(Order, pk=request.data.get("order"))

        # 只能付自己的訂單
        if order.user_id != request.user.id and not request.user.is_staff:
            return Response({"detail": "這不是你的訂單。"}, status=status.HTTP_403_FORBIDDEN)
        # OneToOne：付過就不能再付
        if Payment.objects.filter(order=order).exists():
            return Response({"detail": "這筆訂單已經付款過了。"}, status=status.HTTP_400_BAD_REQUEST)

        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            # TWD 非零小數幣別，金額要換算成「分」（total_price * 100）
            intent = stripe.PaymentIntent.create(
                amount=int(order.total_price * 100),
                currency="twd",
                payment_method_types=["card"],
                metadata={"order_id": order.id, "order_number": order.order_number},
            )
        except stripe.StripeError as e:
            # 連線/金鑰等問題：回 502 + 可讀訊息，不要噴 500 stack
            detail = getattr(e, "user_message", None) or str(e)
            return Response({"detail": f"Stripe 連線失敗：{detail}"},
                            status=status.HTTP_502_BAD_GATEWAY)
        return Response({"client_secret": intent.client_secret})
