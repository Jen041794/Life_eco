from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from orders.models import Order
from payments.models import Payment
from products.models import Product


class AdminStatsTests(APITestCase):
    def test_anonymous_forbidden(self):
        res = self.client.get("/api/admin/stats/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_normal_user_forbidden(self):
        normal = User.objects.create_user("normal", password="pw12345678")
        self.client.force_authenticate(normal)
        res = self.client.get("/api/admin/stats/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_stats_numbers(self):
        admin = User.objects.create_user("admin", password="pw12345678", is_staff=True)
        owner = User.objects.create_user("owner", password="pw12345678")
        Product.objects.create(name="低庫存品", price=Decimal("100.00"), stock=2)   # < 5
        Product.objects.create(name="正常品", price=Decimal("50.00"), stock=20)
        order = Order.objects.create(
            user=owner, total_price=Decimal("200.00"), status=Order.Status.PAID
        )
        Payment.objects.create(
            order=order, user=owner, provider="mock", transaction_id="t1",
            amount=Decimal("200.00"), status=Payment.Status.SUCCESS,
        )

        self.client.force_authenticate(admin)
        res = self.client.get("/api/admin/stats/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.assertEqual(res.data["total_orders"], 1)
        self.assertEqual(res.data["orders_by_status"]["paid"], 1)
        self.assertEqual(res.data["orders_by_status"]["pending"], 0)  # 補 0 的狀態也要在
        self.assertEqual(res.data["total_users"], 2)
        self.assertEqual(Decimal(res.data["total_revenue"]), Decimal("200.00"))

        low_names = [x["name"] for x in res.data["low_stock_products"]]
        self.assertIn("低庫存品", low_names)
        self.assertNotIn("正常品", low_names)

    def test_revenue_excludes_refunded(self):
        admin = User.objects.create_user("admin", password="pw12345678", is_staff=True)
        owner = User.objects.create_user("owner", password="pw12345678")
        order = Order.objects.create(
            user=owner, total_price=Decimal("200.00"), status=Order.Status.CANCELLED
        )
        Payment.objects.create(
            order=order, user=owner, provider="mock", transaction_id="t2",
            amount=Decimal("200.00"), status=Payment.Status.REFUNDED,
        )
        self.client.force_authenticate(admin)
        res = self.client.get("/api/admin/stats/")
        # 已退款不算營收
        self.assertEqual(Decimal(res.data["total_revenue"]), Decimal("0.00"))
