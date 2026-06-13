from django.db import models
from django.contrib.auth.models import User
from orders.models import Order
# Create your models here.

class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', '處理中'
        SUCCESS = 'success', '成功'
        FAILED = 'failed', '失敗'
        REFUNDED = 'refunded', '已退款'

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="payment")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    provider = models.CharField(max_length=50) #Stripe, PayPal
    transaction_id = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.transaction_id} - {self.status}"
