from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase


def get_items(res):
    data = res.data
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data


class UserAuthAPITests(APITestCase):
    def test_register_success_and_password_not_returned(self):
        res = self.client.post(
            "/api/user/register/",
            {"username": "newuser", "email": "n@test.com", "password": "test12345"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("password", res.data)  # 密碼不可外洩
        self.assertTrue(User.objects.filter(username="newuser").exists())

    def test_register_duplicate_username(self):
        User.objects.create_user("dup", password="test12345")
        res = self.client.post(
            "/api/user/register/",
            {"username": "dup", "email": "", "password": "test12345"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_short_password(self):
        res = self.client.post(
            "/api/user/register/", {"username": "shorty", "password": "123"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_tokens(self):
        User.objects.create_user("loginuser", password="test12345")
        res = self.client.post(
            "/api/user/login/", {"username": "loginuser", "password": "test12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

    def test_login_wrong_password(self):
        User.objects.create_user("loginuser2", password="test12345")
        res = self.client.post(
            "/api/user/login/", {"username": "loginuser2", "password": "wrong"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class UserViewSetAPITests(APITestCase):
    def test_me_requires_auth(self):
        res = self.client.get("/api/user/me/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_self(self):
        u = User.objects.create_user("meuser", password="test12345")
        self.client.force_authenticate(u)
        res = self.client.get("/api/user/me/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["username"], "meuser")

    def test_normal_user_lists_only_self(self):
        u = User.objects.create_user("solo", password="test12345")
        User.objects.create_user("other", password="test12345")
        self.client.force_authenticate(u)
        res = self.client.get("/api/user/")
        self.assertEqual(len(get_items(res)), 1)

    def test_admin_lists_all(self):
        admin = User.objects.create_user("admin", password="test12345", is_staff=True)
        User.objects.create_user("normal", password="test12345")
        self.client.force_authenticate(admin)
        res = self.client.get("/api/user/")
        self.assertEqual(len(get_items(res)), 2)

    def test_admin_list_includes_management_fields(self):
        admin = User.objects.create_user("admin", password="test12345", is_staff=True)
        self.client.force_authenticate(admin)
        res = self.client.get("/api/user/")
        self.assertIn("is_active", get_items(res)[0])

    # ---- 後台會員管理分頁：依角色篩選 ----
    def test_admin_can_filter_by_role(self):
        admin = User.objects.create_user("admin", password="test12345", is_staff=True)
        User.objects.create_user("normal", password="test12345")
        self.client.force_authenticate(admin)

        res_customer = self.client.get("/api/user/?role=customer")
        names = [u["username"] for u in get_items(res_customer)]
        self.assertIn("normal", names)
        self.assertNotIn("admin", names)

        res_admin = self.client.get("/api/user/?role=admin")
        names = [u["username"] for u in get_items(res_admin)]
        self.assertIn("admin", names)
        self.assertNotIn("normal", names)


class AdminCreateUserTests(APITestCase):
    """後台新增會員：僅管理員可建，且只能建出一般會員（is_staff=False）。"""

    def setUp(self):
        self.admin = User.objects.create_user("admin", password="test12345", is_staff=True)

    def test_admin_can_create_customer(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/user/create/",
            {"username": "created", "email": "c@test.com", "password": "test12345"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        created = User.objects.get(username="created")
        self.assertFalse(created.is_staff)  # 一定是一般會員
        self.assertTrue(hasattr(created, "userprofile"))  # 一併建好 profile
        self.assertNotIn("password", res.data)

    def test_created_user_is_never_staff_even_if_requested(self):
        # 就算前端硬塞 is_staff=True，後端也不會理會（serializer 沒這個欄位）
        self.client.force_authenticate(self.admin)
        self.client.post(
            "/api/user/create/",
            {"username": "sneaky", "email": "s@test.com", "password": "test12345", "is_staff": True},
            format="json",
        )
        self.assertFalse(User.objects.get(username="sneaky").is_staff)

    def test_normal_user_cannot_create(self):
        normal = User.objects.create_user("normal", password="test12345")
        self.client.force_authenticate(normal)
        res = self.client.post(
            "/api/user/create/",
            {"username": "x", "email": "x@test.com", "password": "test12345"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_create(self):
        res = self.client.post(
            "/api/user/create/",
            {"username": "x", "email": "x@test.com", "password": "test12345"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class MyProfileAPITests(APITestCase):
    """顧客端：讀寫自己的個人資料（電話、地址）。"""

    def setUp(self):
        # 註冊路徑會一併建立 UserProfile；這裡直接走 API 確保 profile 存在
        self.client.post(
            "/api/user/register/",
            {"username": "alice", "email": "a@test.com", "password": "test12345"},
            format="json",
        )
        self.alice = User.objects.get(username="alice")

    def test_profile_requires_auth(self):
        res = self.client.get("/api/user/profile/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_own_profile(self):
        self.client.force_authenticate(self.alice)
        res = self.client.get("/api/user/profile/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["phone"], "")
        self.assertEqual(res.data["address"], "")

    def test_profile_autocreated_for_account_without_one(self):
        # superuser 等用 createsuperuser 建立的帳號沒有 profile，端點要自動補、不能 500
        admin = User.objects.create_superuser("root", "root@test.com", "test12345")
        self.client.force_authenticate(admin)
        res = self.client.get("/api/user/profile/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_update_own_profile(self):
        self.client.force_authenticate(self.alice)
        res = self.client.patch(
            "/api/user/profile/",
            {"phone": "0912345678", "address": "台北市信義區"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.alice.userprofile.refresh_from_db()
        self.assertEqual(self.alice.userprofile.phone, "0912345678")
        self.assertEqual(self.alice.userprofile.address, "台北市信義區")

    def test_invalid_phone_rejected(self):
        # 電話填了就要符合 09 開頭 10 碼
        self.client.force_authenticate(self.alice)
        res = self.client.patch(
            "/api/user/profile/", {"phone": "12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", res.data)

    def test_blank_phone_allowed(self):
        # 但留空仍然可以（非必填）
        self.client.force_authenticate(self.alice)
        res = self.client.patch(
            "/api/user/profile/", {"phone": "", "address": "台北市"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_cannot_touch_other_users_profile(self):
        # bob 登入時，profile 端點只會操作到 bob 自己的，不會碰到 alice
        self.client.post(
            "/api/user/register/",
            {"username": "bob", "email": "b@test.com", "password": "test12345"},
            format="json",
        )
        bob = User.objects.get(username="bob")
        self.client.force_authenticate(bob)
        self.client.patch(
            "/api/user/profile/", {"phone": "0900000000"}, format="json"
        )
        self.alice.userprofile.refresh_from_db()
        self.assertEqual(self.alice.userprofile.phone, "")  # alice 不受影響


class UserAdminActionTests(APITestCase):
    """後台：啟用 / 停用帳號。"""

    def setUp(self):
        self.admin = User.objects.create_user("admin", password="test12345", is_staff=True)
        self.target = User.objects.create_user("target", password="test12345")

    def test_admin_can_deactivate_user(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/user/{self.target.id}/deactivate/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.target.refresh_from_db()
        self.assertFalse(self.target.is_active)

    def test_admin_cannot_deactivate_self(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/user/{self.admin.id}/deactivate/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_normal_user_cannot_deactivate(self):
        normal = User.objects.create_user("normal", password="test12345")
        self.client.force_authenticate(normal)
        res = self.client.post(f"/api/user/{self.target.id}/deactivate/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_activate_user(self):
        self.target.is_active = False
        self.target.save()
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/user/{self.target.id}/activate/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.target.refresh_from_db()
        self.assertTrue(self.target.is_active)

    def test_deactivated_user_cannot_login(self):
        self.target.is_active = False
        self.target.save()
        res = self.client.post(
            "/api/user/login/", {"username": "target", "password": "test12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    # ---- 編輯會員（Email + 狀態）----
    def test_admin_can_update_email_and_status(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(
            f"/api/user/{self.target.id}/update-info/",
            {"email": "new@test.com", "is_active": False},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.target.refresh_from_db()
        self.assertEqual(self.target.email, "new@test.com")
        self.assertFalse(self.target.is_active)

    def test_admin_cannot_deactivate_self_via_update(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(
            f"/api/user/{self.admin.id}/update-info/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_normal_user_cannot_update_info(self):
        normal = User.objects.create_user("normal2", password="test12345")
        self.client.force_authenticate(normal)
        res = self.client.patch(
            f"/api/user/{self.target.id}/update-info/",
            {"email": "x@test.com"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
