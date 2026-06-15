from rest_framework import serializers
from django.contrib.auth.models import User
from django.core.validators import RegexValidator

from .models import UserProfile

# 台灣手機：09 開頭、共 10 碼數字（與前端 validators.js 同一套規則）
phone_validator = RegexValidator(r"^09\d{8}$", "手機需為 09 開頭、共 10 碼數字。")


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class UserProfileSerializer(serializers.ModelSerializer):
    """顧客端：使用者讀寫自己的個人資料（電話、地址）。"""

    # 電話非必填，但填了就要符合手機格式
    phone = serializers.CharField(
        max_length=20, required=False, allow_blank=True, validators=[phone_validator]
    )

    class Meta:
        model = UserProfile
        fields = ['phone', 'address']


class AdminUserSerializer(serializers.ModelSerializer):
    """後台用：多回傳管理欄位（啟用狀態、是否管理員、註冊時間）。"""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_active', 'is_staff', 'date_joined']


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """後台編輯會員：可改 Email 與啟用狀態。"""

    class Meta:
        model = User
        fields = ['email', 'is_active']


class RegisterSerializer(serializers.ModelSerializer):
    """註冊：password 只進不出（write_only），用 create_user 確保密碼有被雜湊。"""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("這個帳號已經有人用了。")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )
        # 一併建立對應的個人資料
        UserProfile.objects.create(user=user)
        return user
