

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# 讀取與 manage.py 同層的 .env（祕密資訊都放這裡，不進 git）
# override=True：讓 .env 成為唯一真相，避免被殘留的系統/工作階段環境變數蓋過
# （曾踩雷：shell 裡留了一把別帳號的 STRIPE_SECRET_KEY，導致前後端帳號不一致）
load_dotenv(BASE_DIR / ".env", override=True)


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
# 真正的金鑰放在 .env；這裡只留一個明顯的開發用預設，避免忘了設定時直接炸掉
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-insecure-please-set-in-env")

# SECURITY WARNING: don't run with debug turned on in production!
# .env 裡設 DJANGO_DEBUG=False 即可關閉（字串 "True" 才算開）
DEBUG = os.environ.get("DJANGO_DEBUG", "True") == "True"

# 用逗號分隔，例如 DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
ALLOWED_HOSTS = [h for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",") if h]

# Stripe 金流（測試模式）：金鑰都放 .env，不進 git
# secret key（sk_test_...）只在後端用；publishable key（pk_test_...）給前端
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")


# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "products",
    "orders",
    "payments",
    "user",
    "dashboard",
    "rest_framework",
    "drf_yasg",
    "corsheaders",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # WhiteNoise 緊接在 SecurityMiddleware 之後，負責在正式環境提供靜態檔（admin / API 文件的 CSS）
    "whitenoise.middleware.WhiteNoiseMiddleware",
    # CorsMiddleware 要放在很前面（CommonMiddleware 之前），才能正確加上 CORS 標頭
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "ecommerce.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "ecommerce.wsgi.application"


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

# 資料庫：
# - 正式環境設 DATABASE_URL（Supabase PostgreSQL 連線字串）→ 直接吃它
# - 本機沒設 DATABASE_URL → 沿用原本的本機 MySQL，開發環境完全不受影響
DATABASE_URL = os.environ.get("DATABASE_URL", "")
if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL, conn_max_age=600, ssl_require=True
        ),
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.environ.get("DB_NAME", "ecommerce_db"),
            "USER": os.environ.get("DB_USER", "root"),
            "PASSWORD": os.environ.get("DB_PASSWORD", ""),
            "HOST": os.environ.get("DB_HOST", "localhost"),
            "PORT": os.environ.get("DB_PORT", "3306"),
        }
    }


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    # 分頁：列表 API 預設一頁 10 筆，用 ?page=2 翻頁
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
}

# CORS：允許 React 前端（不同網址）呼叫這些 API
# 本機開發預設允許 CRA(3000) 與 Vite(5173)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
# 正式環境用環境變數補上前端正式網址（逗號分隔），例如：
#   CORS_ALLOWED_ORIGINS=https://life-eco.vercel.app
CORS_ALLOWED_ORIGINS += [
    o.strip() for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",") if o.strip()
]

# 跨網域 POST（後台、付款流程）需要信任的來源；正式環境用環境變數帶入，例如：
#   CSRF_TRUSTED_ORIGINS=https://life-eco.vercel.app
CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",") if o.strip()
]

# JWT 效期：開發階段把 access token 拉長，免得後台一直被登出
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Taipei"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = "static/"
# collectstatic 會把所有靜態檔（admin、drf_yasg 等）收集到這裡，由 WhiteNoise 在正式環境提供
STATIC_ROOT = BASE_DIR / "staticfiles"

# WhiteNoise：靜態檔壓縮 + 加雜湊檔名，正式環境提供效能較好
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# 商品圖片等上傳檔案：存在專案的 media/ 資料夾，用 /media/ 網址讀取
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


# === 正式環境安全設定（只在 DEBUG=False 時生效）===
# 本機開發 DEBUG=True 不受影響；上線把 DJANGO_DEBUG 設成 False 就會自動開啟。
# 對應 `manage.py check --deploy` 的 5 個警告。
if not DEBUG:
    # Render 等平台在反向代理後面，靠這個標頭判斷原始請求是否為 HTTPS
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True            # HTTP 一律轉成 HTTPS
    SESSION_COOKIE_SECURE = True          # session cookie 只走加密連線
    CSRF_COOKIE_SECURE = True             # CSRF cookie 只走加密連線
    SECURE_HSTS_SECONDS = 31536000        # 一年內強制瀏覽器只用 HTTPS
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
