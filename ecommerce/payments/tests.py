from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Product
from orders.models import Order, OrderItem
from .models import Payment


def get_items(res):
    data = res.data
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data


class PaymentAPITests(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user("userA", password="pw12345678")
        self.user_b = User.objects.create_user("userB", password="pw12345678")
        self.product = Product.objects.create(name="商品", price=Decimal("100.00"), stock=10)
        self.order = Order.objects.create(
            user=self.user_a, total_price=Decimal("200.00"), status="pending"
        )
        OrderItem.objects.create(
            order=self.order, product=self.product, quantity=2, price=Decimal("100.00")
        )

    def test_create_requires_auth(self):
        res = self.client.post(
            "/api/payments/", {"order": self.order.id, "provider": "mock"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_pay_own_order_success_marks_order_paid(self):
        self.client.force_authenticate(self.user_a)
        res = self.client.post(
            "/api/payments/", {"order": self.order.id, "provider": "mock"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], "success")
        self.assertTrue(res.data["transaction_id"].startswith("mock_"))
        self.assertEqual(Decimal(res.data["amount"]), Decimal("200.00"))
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "paid")

    def test_duplicate_payment_rejected(self):
        self.client.force_authenticate(self.user_a)
        self.client.post(
            "/api/payments/", {"order": self.order.id, "provider": "mock"}, format="json"
        )
        res = self.client.post(
            "/api/payments/", {"order": self.order.id, "provider": "mock"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_pay_others_order(self):
        self.client.force_authenticate(self.user_b)
        res = self.client.post(
            "/api/payments/", {"order": self.order.id, "provider": "mock"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_only_sees_own_payments(self):
        self.client.force_authenticate(self.user_a)
        self.client.post(
            "/api/payments/", {"order": self.order.id, "provider": "mock"}, format="json"
        )
        self.client.force_authenticate(self.user_b)
        res = self.client.get("/api/payments/")
        self.assertEqual(len(get_items(res)), 0)
