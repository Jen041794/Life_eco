from rest_framework import viewsets, generics, permissions, status as http_status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.models import User

from .serializers import (
    UserSerializer,
    AdminUserSerializer,
    AdminUserUpdateSerializer,
    RegisterSerializer,
)


# 使用者查詢（唯讀）：要登入；一般人只查得到自己，管理員可查全部
class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()  # 給 router 推導名稱用；實際資料以 get_queryset() 為準
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return User.objects.none()

        user = self.request.user
        if user.is_staff:
            return User.objects.all().order_by("id")
        return User.objects.filter(id=user.id).order_by("id")

    def get_serializer_class(self):
        # 管理員看得到管理欄位（is_active 等），一般使用者用精簡版
        if self.request.user.is_authenticated and self.request.user.is_staff:
            return AdminUserSerializer
        return UserSerializer

    @action(detail=False, methods=["get"])
    def me(self, request):
        """GET /api/user/me/ — 取得目前登入者自己的資料。"""
        return Response(self.get_serializer(request.user).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def deactivate(self, request, pk=None):
        """POST /api/user/{id}/deactivate/ — 管理員停用帳號（停用後無法登入）。"""
        target = self.get_object()
        if target == request.user:
            return Response(
                {"detail": "不能停用自己的帳號。"},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
        target.is_active = False
        target.save()
        return Response(AdminUserSerializer(target).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def activate(self, request, pk=None):
        """POST /api/user/{id}/activate/ — 管理員重新啟用帳號。"""
        target = self.get_object()
        target.is_active = True
        target.save()
        return Response(AdminUserSerializer(target).data)

    @action(detail=True, methods=["patch"], url_path="update-info",
            permission_classes=[permissions.IsAdminUser])
    def update_info(self, request, pk=None):
        """PATCH /api/user/{id}/update-info/ — 管理員編輯會員（Email + 啟用狀態）。"""
        target = self.get_object()
        serializer = AdminUserUpdateSerializer(target, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        # 不能把自己停用（避免把自己鎖在外面）
        if target == request.user and serializer.validated_data.get("is_active") is False:
            return Response(
                {"detail": "不能停用自己的帳號。"},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
        serializer.save()
        return Response(AdminUserSerializer(target).data)


# 註冊 API：任何人都可呼叫
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


# 登入 API：用帳密換取 JWT（access + refresh），等同 /api/token/
class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
