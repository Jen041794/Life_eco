from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

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


class StripePaymentTests(APITestCase):
    """Stripe 付款：後端不盲信前端，會拿 payment_intent_id 回 Stripe 查證。
    對應 TEST_CASES.md 的 PAY-08~11，是我面試最想講的「信任邊界」亮點。
    這裡把 stripe.PaymentIntent.retrieve mock 掉，不真的連線。"""

    def setUp(self):
        self.user_a = User.objects.create_user("userA", password="pw12345678")
        self.product = Product.objects.create(name="商品", price=Decimal("100.00"), stock=10)
        self.order = Order.objects.create(
            user=self.user_a, total_price=Decimal("200.00"), status="pending"
        )
        OrderItem.objects.create(
            order=self.order, product=self.product, quantity=2, price=Decimal("100.00")
        )
        self.client.force_authenticate(self.user_a)

    def test_stripe_missing_intent_id_rejected(self):
        """provider=stripe 卻沒帶 payment_intent_id → 400（連 Stripe 都不會呼叫）。"""
        res = self.client.post(
            "/api/payments/", {"order": self.order.id, "provider": "stripe"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("payments.serializers.stripe.PaymentIntent.retrieve")
    def test_stripe_intent_not_succeeded_rejected(self, mock_retrieve):
        """Stripe 那邊狀態還不是 succeeded → 擋下，訂單不會變 paid。"""
        mock_retrieve.return_value = SimpleNamespace(
            id="pi_test", status="requires_payment_method", amount=20000, currency="twd"
        )
        res = self.client.post(
            "/api/payments/",
            {"order": self.order.id, "provider": "stripe", "payment_intent_id": "pi_test"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "pending")

    @patch("payments.serializers.stripe.PaymentIntent.retrieve")
    def test_stripe_amount_tampered_rejected(self, mock_retrieve):
        """金額被竄改：intent 金額和訂單對不上就擋下（PAY-11 核心）。
        訂單總價 200 元 → 應為 20000 分，這裡故意回 100 分。"""
        mock_retrieve.return_value = SimpleNamespace(
            id="pi_test", status="succeeded", amount=100, currency="twd"
        )
        res = self.client.post(
            "/api/payments/",
            {"order": self.order.id, "provider": "stripe", "payment_intent_id": "pi_test"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Payment.objects.filter(order=self.order).exists())
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "pending")

    @patch("payments.serializers.stripe.PaymentIntent.retrieve")
    def test_stripe_wrong_currency_rejected(self, mock_retrieve):
        """幣別不符（非 twd）一樣擋下，避免用外幣金額魚目混珠。"""
        mock_retrieve.return_value = SimpleNamespace(
            id="pi_test", status="succeeded", amount=20000, currency="usd"
        )
        res = self.client.post(
            "/api/payments/",
            {"order": self.order.id, "provider": "stripe", "payment_intent_id": "pi_test"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("payments.serializers.stripe.PaymentIntent.retrieve")
    def test_stripe_valid_intent_marks_order_paid(self, mock_retrieve):
        """狀態 succeeded、金額與幣別都對 → 201，訂單轉 paid、交易號用 Stripe 的 intent id。"""
        mock_retrieve.return_value = SimpleNamespace(
            id="pi_valid_123", status="succeeded", amount=20000, currency="twd"
        )
        res = self.client.post(
            "/api/payments/",
            {"order": self.order.id, "provider": "stripe", "payment_intent_id": "pi_valid_123"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], "success")
        self.assertEqual(res.data["transaction_id"], "pi_valid_123")
        self.assertEqual(res.data["provider"], "stripe")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "paid")
