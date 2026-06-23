import uuid

import stripe
from django.conf import settings
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
    """建立付款。amount 由訂單金額決定，user/狀態都在後端產生。
    - provider='mock'：不接金流，一律成功（給測試與 demo 用）
    - provider='stripe'：需附 payment_intent_id，後端會跟 Stripe 查證後才寫入"""

    # 只有 Stripe 付款才會帶；寫入用、不回傳
    payment_intent_id = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Payment
        fields = ['id', 'order', 'provider', 'payment_intent_id']

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

        if provider == 'stripe':
            # 不盲信前端：拿 payment_intent_id 回 Stripe 查證，金額/狀態都對才算數
            intent_id = validated_data.get('payment_intent_id')
            if not intent_id:
                raise serializers.ValidationError("Stripe 付款需附 payment_intent_id。")
            stripe.api_key = settings.STRIPE_SECRET_KEY
            try:
                intent = stripe.PaymentIntent.retrieve(intent_id)
            except Exception:
                raise serializers.ValidationError("查不到這筆 Stripe 付款。")
            if intent.status != 'succeeded':
                raise serializers.ValidationError("這筆 Stripe 付款尚未成功。")
            # 金額（換算成分）與幣別都要和訂單相符，避免被竄改
            if intent.amount != int(order.total_price * 100) or intent.currency != 'twd':
                raise serializers.ValidationError("付款金額與訂單不符。")
            success = True
            transaction_id = intent.id
        else:
            # 模擬金流：一律回傳成功，給測試與 demo 用
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
