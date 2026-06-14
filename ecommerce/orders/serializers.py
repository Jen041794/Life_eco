from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from orders.models import Order, OrderItem
from products.models import Product
from products.serializers import ProductSerializer


# ---- 讀取用（回傳給前端看的格式）----
class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity', 'price']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user = serializers.StringRelatedField()

    class Meta:
        model = Order
        fields = ['id', 'user', 'total_price', 'status', 'created_at', 'items',
                  'recipient_name', 'recipient_phone', 'shipping_address']


# ---- 寫入用（前端送購物車進來建立訂單）----
class OrderItemWriteSerializer(serializers.Serializer):
    """單一購物車項目：指定商品 id 與數量。"""
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    quantity = serializers.IntegerField(min_value=1)


class OrderCreateSerializer(serializers.ModelSerializer):
    """一次帶 items 建立訂單：自動算總價、扣庫存、寫進 OrderItem。"""
    items = OrderItemWriteSerializer(many=True, write_only=True)
    # 收件資訊結帳必填：明確宣告成 CharField（預設 required=True、allow_blank=False），
    # 蓋掉 model blank=True 會產生的「可省略」行為。
    recipient_name = serializers.CharField(max_length=100)
    recipient_phone = serializers.CharField(max_length=20)
    shipping_address = serializers.CharField()

    class Meta:
        model = Order
        fields = ['id', 'status', 'total_price', 'items',
                  'recipient_name', 'recipient_phone', 'shipping_address']
        read_only_fields = ['status', 'total_price']

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("訂單至少要有一項商品。")
        return items

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = validated_data['user']  # 由 view 的 perform_create 帶進來

        # 用 transaction 包起來：中途若庫存不足就整筆回滾，不會留下半成品訂單
        with transaction.atomic():
            order = Order.objects.create(
                user=user,
                total_price=Decimal('0'),
                recipient_name=validated_data['recipient_name'],
                recipient_phone=validated_data['recipient_phone'],
                shipping_address=validated_data['shipping_address'],
            )
            total = Decimal('0')
            for item in items_data:
                product = item['product']
                quantity = item['quantity']
                if product.stock < quantity:
                    raise serializers.ValidationError(
                        f"「{product.name}」庫存不足（剩 {product.stock}，需要 {quantity}）"
                    )
                product.stock -= quantity
                product.save()
                # price 用「下單當下」的商品價格做快照，之後商品改價不影響舊訂單
                OrderItem.objects.create(
                    order=order, product=product, quantity=quantity, price=product.price
                )
                total += product.price * quantity

            order.total_price = total
            order.save()
        return order

    def to_representation(self, instance):
        # 建立完成後，用完整的 OrderSerializer 格式回傳
        return OrderSerializer(instance, context=self.context).data


# ---- 後台：更新訂單狀態 ----
class OrderStatusSerializer(serializers.ModelSerializer):
    """管理員更新訂單狀態，只允許「往前推進」的合法轉換。取消請走 /cancel/。"""

    # 合法的狀態流轉：待付款 → 已付款 → 已出貨 → 已完成
    ALLOWED_TRANSITIONS = {
        Order.Status.PENDING: [Order.Status.PAID],
        Order.Status.PAID: [Order.Status.SHIPPED],
        Order.Status.SHIPPED: [Order.Status.COMPLETED],
        Order.Status.COMPLETED: [],
        Order.Status.CANCELLED: [],
    }

    class Meta:
        model = Order
        fields = ['id', 'status']

    def validate_status(self, new_status):
        current = self.instance.status
        if new_status == current:
            raise serializers.ValidationError(f"訂單已經是「{current}」狀態了。")
        allowed = self.ALLOWED_TRANSITIONS.get(current, [])
        if new_status not in allowed:
            raise serializers.ValidationError(
                f"不允許從「{current}」改成「{new_status}」。（取消訂單請用 /cancel/）"
            )
        return new_status
