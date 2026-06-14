import tempfile
from decimal import Decimal
from io import BytesIO

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Product, Category


def make_image(name="test.png"):
    """產生一張很小的合法 PNG，給上傳測試用。"""
    buf = BytesIO()
    Image.new("RGB", (10, 10), "red").save(buf, format="PNG")
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type="image/png")


def get_items(res):
    """列表回應：加了分頁後會變成 {results: [...]}，沒分頁就是 list。兩種都吃。"""
    data = res.data
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data


class ProductAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user("admin", password="pw12345678", is_staff=True)
        self.user = User.objects.create_user("user", password="pw12345678")
        self.product = Product.objects.create(
            name="機械鍵盤", description="青軸機械鍵盤", price=Decimal("1000.00"), stock=5
        )

    # ---- 讀取（公開）----
    def test_list_is_public(self):
        res = self.client.get("/api/products/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_retrieve_is_public(self):
        res = self.client.get(f"/api/products/{self.product.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_retrieve_not_found(self):
        res = self.client.get("/api/products/99999/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_search_by_keyword(self):
        res = self.client.get("/api/products/?search=機械")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in get_items(res)]
        self.assertIn("機械鍵盤", names)

    # ---- 寫入（限管理員）----
    def test_anonymous_cannot_create(self):
        res = self.client.post("/api/products/", {"name": "x", "price": "1.00", "stock": 1})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_normal_user_cannot_create(self):
        self.client.force_authenticate(self.user)
        res = self.client.post("/api/products/", {"name": "x", "price": "1.00", "stock": 1})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post("/api/products/", {"name": "滑鼠", "price": "500.00", "stock": 3})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 2)

    def test_admin_can_update(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f"/api/products/{self.product.id}/", {"price": "1200.00"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal("1200.00"))

    def test_admin_can_delete(self):
        self.client.force_authenticate(self.admin)
        res = self.client.delete(f"/api/products/{self.product.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Product.objects.count(), 0)


class CategoryAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user("admin", password="pw12345678", is_staff=True)
        self.user = User.objects.create_user("user", password="pw12345678")
        self.category = Category.objects.create(name="3C")

    # ---- 讀取（公開）----
    def test_list_is_public(self):
        res = self.client.get("/api/categories/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in get_items(res)]
        self.assertIn("3C", names)

    def test_list_is_not_paginated(self):
        # 分類給下拉選單/管理頁用，要一次回全部純陣列（前端直接 map，不是 {results:[]}）
        res = self.client.get("/api/categories/")
        self.assertIsInstance(res.data, list)

    def test_product_count_in_response(self):
        Product.objects.create(name="鍵盤", price=Decimal("100.00"), stock=1, category=self.category)
        res = self.client.get(f"/api/categories/{self.category.id}/")
        self.assertEqual(res.data["product_count"], 1)

    # ---- 寫入（限管理員）----
    def test_anonymous_cannot_create(self):
        res = self.client.post("/api/categories/", {"name": "家電"})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_normal_user_cannot_create(self):
        self.client.force_authenticate(self.user)
        res = self.client.post("/api/categories/", {"name": "家電"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post("/api/categories/", {"name": "家電"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Category.objects.count(), 2)

    def test_duplicate_name_rejected(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post("/api/categories/", {"name": "3C"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_rename(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f"/api/categories/{self.category.id}/", {"name": "電腦周邊"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.category.refresh_from_db()
        self.assertEqual(self.category.name, "電腦周邊")

    def test_admin_can_delete_sets_product_category_null(self):
        # 刪分類後，原本掛在底下的商品 category 變 null（SET_NULL），商品不會被刪
        product = Product.objects.create(
            name="鍵盤", price=Decimal("100.00"), stock=1, category=self.category
        )
        self.client.force_authenticate(self.admin)
        res = self.client.delete(f"/api/categories/{self.category.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        product.refresh_from_db()
        self.assertIsNone(product.category)


class ProductCategoryAndActiveTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user("admin", password="pw12345678", is_staff=True)
        self.user = User.objects.create_user("user", password="pw12345678")
        self.cat_a = Category.objects.create(name="3C")
        self.cat_b = Category.objects.create(name="家電")
        self.active = Product.objects.create(
            name="上架鍵盤", price=Decimal("100.00"), stock=1, category=self.cat_a, is_active=True
        )
        self.inactive = Product.objects.create(
            name="下架滑鼠", price=Decimal("100.00"), stock=1, category=self.cat_a, is_active=False
        )
        self.other_cat = Product.objects.create(
            name="電風扇", price=Decimal("100.00"), stock=1, category=self.cat_b, is_active=True
        )

    # ---- 上下架可見性 ----
    def test_anonymous_sees_only_active(self):
        res = self.client.get("/api/products/")
        names = [item["name"] for item in get_items(res)]
        self.assertIn("上架鍵盤", names)
        self.assertNotIn("下架滑鼠", names)

    def test_anonymous_cannot_retrieve_inactive(self):
        res = self.client.get(f"/api/products/{self.inactive.id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_sees_inactive(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/products/")
        names = [item["name"] for item in get_items(res)]
        self.assertIn("下架滑鼠", names)

    # ---- 分類篩選 ----
    def test_filter_by_category(self):
        res = self.client.get(f"/api/products/?category={self.cat_b.id}")
        names = [item["name"] for item in get_items(res)]
        self.assertEqual(names, ["電風扇"])

    def test_serializer_exposes_category_name(self):
        res = self.client.get(f"/api/products/{self.active.id}/")
        self.assertEqual(res.data["category"], self.cat_a.id)
        self.assertEqual(res.data["category_name"], "3C")

    # ---- 管理員切換上下架 ----
    def test_admin_can_toggle_is_active(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f"/api/products/{self.active.id}/", {"is_active": False})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.active.refresh_from_db()
        self.assertFalse(self.active.is_active)

    def test_admin_can_set_category(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f"/api/products/{self.active.id}/", {"category": self.cat_b.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.active.refresh_from_db()
        self.assertEqual(self.active.category_id, self.cat_b.id)

    def test_admin_can_clear_category_with_empty_string(self):
        # 前端 multipart 表單把分類選成「無」時送空字串，後端要當成 null 處理
        self.client.force_authenticate(self.admin)
        res = self.client.patch(
            f"/api/products/{self.active.id}/", {"category": ""}, format="multipart"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.active.refresh_from_db()
        self.assertIsNone(self.active.category)


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class ProductImageTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user("admin", password="pw12345678", is_staff=True)

    def test_create_product_with_images(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/products/",
            {
                "name": "有圖商品", "price": "100.00", "stock": 5,
                "images": [make_image("a.png"), make_image("b.png")],
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        product = Product.objects.get(id=res.data["id"])
        self.assertEqual(product.images.count(), 2)
        self.assertEqual(len(res.data["images"]), 2)

    def test_more_than_3_images_rejected(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/products/",
            {
                "name": "太多圖", "price": "100.00", "stock": 5,
                "images": [make_image(f"{i}.png") for i in range(4)],
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Product.objects.count(), 0)  # 連商品都不該被建立

    def test_update_replaces_images(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            "/api/products/",
            {"name": "商品", "price": "100.00", "stock": 5, "images": [make_image("old.png")]},
            format="multipart",
        )
        pid = created.data["id"]
        # 重新上傳兩張 → 取代原本一張
        res = self.client.patch(
            f"/api/products/{pid}/",
            {"images": [make_image("new1.png"), make_image("new2.png")]},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(Product.objects.get(id=pid).images.count(), 2)
