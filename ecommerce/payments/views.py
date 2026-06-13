from rest_framework import viewsets, mixins, permissions

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
