import random
import string

from django.db import models
from django.contrib.auth.models import User
from products.models import Product

# 對外訂單編號：大寫英文 + 數字、共 13 碼（內部仍用自動遞增的 id 做關聯）
ORDER_NUMBER_CHARS = string.ascii_uppercase + string.digits
ORDER_NUMBER_LENGTH = 13


def generate_order_number():
    return "".join(random.choices(ORDER_NUMBER_CHARS, k=ORDER_NUMBER_LENGTH))


# Create your models here.

class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', '待付款'
        PAID = 'paid', '已付款'
        SHIPPED = 'shipped', '已出貨'
        COMPLETED = 'completed', '已完成'
        CANCELLED = 'cancelled', '已取消'

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    # 對外顯示的訂單編號（13 碼大寫英數，唯一）；建立時自動產生
    order_number = models.CharField(max_length=ORDER_NUMBER_LENGTH, unique=True, editable=False)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    # 收件資訊：結帳時填入。model 層用 blank=True（讓舊資料 / ORM 直接建立不被擋），
    # 「必填」改由 OrderCreateSerializer 在 API 層強制。
    recipient_name = models.CharField(max_length=100, blank=True)
    recipient_phone = models.CharField(max_length=20, blank=True)
    shipping_address = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        # 還沒有編號就產生一個，並確保不撞號（unique 約束是最後防線）
        if not self.order_number:
            number = generate_order_number()
            while Order.objects.filter(order_number=number).exists():
                number = generate_order_number()
            self.order_number = number
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order {self.order_number} - {self.user.username}"
    

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveBigIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"