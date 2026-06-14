from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Product
from .models import Order


def get_items(res):
    data = res.data
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data


class OrderAPITests(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user("userA", password="pw12345678")
        self.user_b = User.objects.create_user("userB", password="pw12345678")
        self.admin = User.objects.create_user("admin", password="pw12345678", is_staff=True)
        self.p1 = Product.objects.create(name="商品1", price=Decimal("100.00"), stock=10)
        self.p2 = Product.objects.create(name="商品2", price=Decimal("50.00"), stock=5)

    # 收件資訊現在是結帳必填，預設帶一組進去；要測「缺收件資訊」的案例再覆寫
    SHIPPING = {
        "recipient_name": "王小明",
        "recipient_phone": "0912345678",
        "shipping_address": "台北市信義區市府路 1 號",
    }

    def _order_payload(self, items):
        return {"items": items, **self.SHIPPING}

    def test_create_requires_auth(self):
        res = self.client.post(
            "/api/orders/", self._order_payload([{"product": self.p1.id, "quantity": 1}]), format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_order_calculates_total_and_deducts_stock(self):
        self.client.force_authenticate(self.user_a)
        res = self.client.post(
            "/api/orders/",
            self._order_payload([
                {"product": self.p1.id, "quantity": 2},
                {"product": self.p2.id, "quantity": 1},
            ]),
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        # 100*2 + 50*1 = 250
        self.assertEqual(Decimal(res.data["total_price"]), Decimal("250.00"))
        self.assertEqual(res.data["status"], "pending")
        self.p1.refresh_from_db()
        self.p2.refresh_from_db()
        self.assertEqual(self.p1.stock, 8)
        self.assertEqual(self.p2.stock, 4)

    def test_empty_items_rejected(self):
        self.client.force_authenticate(self.user_a)
        res = self.client.post("/api/orders/", self._order_payload([]), format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # ---- 收件資訊 ----
    def test_shipping_info_saved_and_returned(self):
        """結帳帶的收件資訊要存進訂單，讀訂單時也要回得出來。"""
        self.client.force_authenticate(self.user_a)
        res = self.client.post(
            "/api/orders/",
            self._order_payload([{"product": self.p1.id, "quantity": 1}]),
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["recipient_name"], "王小明")
        self.assertEqual(res.data["recipient_phone"], "0912345678")
        self.assertEqual(res.data["shipping_address"], "台北市信義區市府路 1 號")
        # 重新 GET 一次，確認有落地（不是只在回應裡）
        detail = self.client.get(f"/api/orders/{res.data['id']}/")
        self.assertEqual(detail.data["recipient_name"], "王小明")

    def test_missing_shipping_info_rejected(self):
        """收件資訊是必填，沒帶就擋下（400）。"""
        self.client.force_authenticate(self.user_a)
        res = self.client.post(
            "/api/orders/",
            {"items": [{"product": self.p1.id, "quantity": 1}]},  # 故意不帶收件資訊
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("recipient_name", res.data)

    def test_blank_recipient_name_rejected(self):
        """收件人不能是空字串。"""
        self.client.force_authenticate(self.user_a)
        payload = self._order_payload([{"product": self.p1.id, "quantity": 1}])
        payload["recipient_name"] = ""
        res = self.client.post("/api/orders/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_zero_quantity_rejected(self):
        self.client.force_authenticate(self.user_a)
        res = self.client.post(
            "/api/orders/", self._order_payload([{"product": self.p1.id, "quantity": 0}]), format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_product_rejected(self):
        self.client.force_authenticate(self.user_a)
        res = self.client.post(
            "/api/orders/", self._order_payload([{"product": 99999, "quantity": 1}]), format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_insufficient_stock_rejected_and_rolls_back(self):
        """庫存不足要整筆回滾：庫存沒被扣、也不能留下半成品訂單。"""
        self.client.force_authenticate(self.user_a)
        res = self.client.post(
            "/api/orders/",
            self._order_payload([
                {"product": self.p1.id, "quantity": 2},   # 這項夠
                {"product": self.p2.id, "quantity": 999},  # 這項爆庫存
            ]),
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.p1.refresh_from_db()
        self.assertEqual(self.p1.stock, 10)          # 沒被扣
        self.assertEqual(Order.objects.count(), 0)   # 沒有殘留訂單

    def test_user_only_sees_own_orders(self):
        self.client.force_authenticate(self.user_a)
        self.client.post(
            "/api/orders/", self._order_payload([{"product": self.p1.id, "quantity": 1}]), format="json"
        )
        # 換 userB 看，應該看不到 userA 的訂單
        self.client.force_authenticate(self.user_b)
        res = self.client.get("/api/orders/")
        self.assertEqual(len(get_items(res)), 0)

    def test_user_cannot_retrieve_others_order(self):
        self.client.force_authenticate(self.user_a)
        created = self.client.post(
            "/api/orders/", self._order_payload([{"product": self.p1.id, "quantity": 1}]), format="json"
        )
        order_id = created.data["id"]
        self.client.force_authenticate(self.user_b)
        res = self.client.get(f"/api/orders/{order_id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_sees_all_orders(self):
        self.client.force_authenticate(self.user_a)
        self.client.post(
            "/api/orders/", self._order_payload([{"product": self.p1.id, "quantity": 1}]), format="json"
        )
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/orders/")
        self.assertEqual(len(get_items(res)), 1)

    def test_filter_by_status(self):
        self.client.force_authenticate(self.user_a)
        self.client.post(
            "/api/orders/", self._order_payload([{"product": self.p1.id, "quantity": 1}]), format="json"
        )
        paid = self.client.post(
            "/api/orders/", self._order_payload([{"product": self.p1.id, "quantity": 1}]), format="json"
        )
        Order.objects.filter(id=paid.data["id"]).update(status=Order.Status.PAID)
        res = self.client.get("/api/orders/?status=paid")
        items = get_items(res)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["status"], "paid")

    def test_admin_search_orders_by_customer(self):
        self.client.force_authenticate(self.user_a)
        self.client.post(
            "/api/orders/", self._order_payload([{"product": self.p1.id, "quantity": 1}]), format="json"
        )
        self.client.force_authenticate(self.user_b)
        self.client.post(
            "/api/orders/", self._order_payload([{"product": self.p2.id, "quantity": 1}]), format="json"
        )
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/orders/?search=userA")
        items = get_items(res)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["user"], "userA")


class OrderAdminActionTests(APITestCase):
    """後台：更新訂單狀態、取消訂單（回補庫存 / mock 退款）。"""

    def setUp(self):
        self.owner = User.objects.create_user("owner", password="pw12345678")
        self.other = User.objects.create_user("other", password="pw12345678")
        self.admin = User.objects.create_user("admin", password="pw12345678", is_staff=True)
        self.product = Product.objects.create(name="商品", price=Decimal("100.00"), stock=10)

    def _make_order(self, quantity=2):
        self.client.force_authenticate(self.owner)
        res = self.client.post(
            "/api/orders/",
            {
                "items": [{"product": self.product.id, "quantity": quantity}],
                "recipient_name": "王小明",
                "recipient_phone": "0912345678",
                "shipping_address": "台北市信義區市府路 1 號",
            },
            format="json",
        )
        return res.data["id"]

    # ---- 狀態更新 ----
    def test_admin_can_advance_status(self):
        order_id = self._make_order()
        Order.objects.filter(id=order_id).update(status=Order.Status.PAID)
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f"/api/orders/{order_id}/status/", {"status": "shipped"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "shipped")

    def test_illegal_transition_rejected(self):
        order_id = self._make_order()  # pending
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f"/api/orders/{order_id}/status/", {"status": "completed"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_normal_user_cannot_update_status(self):
        order_id = self._make_order()
        self.client.force_authenticate(self.owner)
        res = self.client.patch(f"/api/orders/{order_id}/status/", {"status": "paid"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # ---- 取消 / 庫存回補 ----
    def test_owner_cancel_pending_restores_stock(self):
        order_id = self._make_order(quantity=2)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)  # 下單已扣
        self.client.force_authenticate(self.owner)
        res = self.client.post(f"/api/orders/{order_id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "cancelled")
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)  # 回補

    def test_admin_cancel_paid_order_refunds_payment(self):
        order_id = self._make_order(quantity=2)
        self.client.force_authenticate(self.owner)
        self.client.post("/api/payments/", {"order": order_id, "provider": "mock"}, format="json")
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/orders/{order_id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        from payments.models import Payment
        payment = Payment.objects.get(order_id=order_id)
        self.assertEqual(payment.status, "refunded")
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)

    def test_user_cannot_cancel_paid_order(self):
        order_id = self._make_order()
        self.client.force_authenticate(self.owner)
        self.client.post("/api/payments/", {"order": order_id, "provider": "mock"}, format="json")
        res = self.client.post(f"/api/orders/{order_id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_cancel_shipped_order(self):
        order_id = self._make_order()
        Order.objects.filter(id=order_id).update(status=Order.Status.SHIPPED)
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/orders/{order_id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_cannot_cancel_others_order(self):
        order_id = self._make_order()
        self.client.force_authenticate(self.other)
        res = self.client.post(f"/api/orders/{order_id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
