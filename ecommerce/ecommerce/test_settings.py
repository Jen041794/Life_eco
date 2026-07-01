"""測試專用設定：用 in-memory SQLite，與正式 / 開發資料庫完全隔離。
- 跑得快、不需要啟動 MySQL / 連 Supabase，也不會碰到任何真實資料。
- 用法：python manage.py test --settings=ecommerce.test_settings
"""
from .settings import *  # noqa: F401,F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# 測試不必用強雜湊，換成最快的 hasher 加速建立測試使用者
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
