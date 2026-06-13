import uuid

from django.db import transaction
from rest_framework import serializers

from orders.models import Order
from payments.models import Payment


# ---- 讀取用 ----
class PaymentSerializer(serializers.ModelSerializer):
    order = serializers.PrimaryKeyRelatedField(read_only=True)
    user = serializers.StringRelatedField()

    class Meta:
        model = Payment
        fields = ['id', 'order', 'user', 'provider', 'transaction_id',
                  'amount', 'status', 'created_at']


# ---- 寫入用（前端對某張訂單發起付款）----
class PaymentCreateSerializer(serializers.ModelSerializer):
    """建立付款。amount 由訂單金額決定，user/狀態都在後端產生，前端只送 order + provider。"""

    class Meta:
        model = Payment
        fields = ['id', 'order', 'provider']

    def validate_order(self, order):
        request = self.context['request']
        # 只能付自己的訂單
        if order.user_id != request.user.id and not request.user.is_staff:
            raise serializers.ValidationError("這不是你的訂單。")
        # OneToOne：付過就不能再付
        if Payment.objects.filter(order=order).exists():
            raise serializers.ValidationError("這筆訂單已經付款過了。")
        return order

    def create(self, validated_data):
        order = validated_data['order']
        provider = validated_data.get('provider') or 'mock'

        # ===================================================================
        # 模擬金流：目前一律回傳成功，方便前端先串流程。
        # 之後要接 Stripe 測試模式時，把下面這段換成真正的 API 呼叫即可，例如：
        #   import stripe
        #   stripe.api_key = settings.STRIPE_SECRET_KEY      # sk_test_...
        #   intent = stripe.PaymentIntent.create(
        #       amount=int(order.total_price * 100), currency="twd", ...)
        #   success = intent.status == "succeeded"
        #   transaction_id = intent.id
        # ===================================================================
        success = True
        transaction_id = f"mock_{uuid.uuid4().hex[:24]}"
        status = Payment.Status.SUCCESS if success else Payment.Status.FAILED

        with transaction.atomic():
            payment = Payment.objects.create(
                order=order,
                user=order.user,
                provider=provider,
                transaction_id=transaction_id,
                amount=order.total_price,
                status=status,
            )
            if success:
                order.status = Order.Status.PAID
                order.save()
        return payment

    def to_representation(self, instance):
        return PaymentSerializer(instance, context=self.context).data
