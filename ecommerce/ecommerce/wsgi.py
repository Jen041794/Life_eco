"""
WSGI config for ecommerce project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ecommerce.settings")

application = get_wsgi_application()

# 正式環境（gunicorn）用 WhiteNoise 在 WSGI 層直接提供商品圖片(media)。
# 比 Django 的 serve() 穩定有效率 —— serve() 用同步 worker 讀大圖會卡住，
# 導致 Render 邊緣層間歇回 404。本機 runserver 不走這支 wsgi，仍由 urls.py 提供 media。
from django.conf import settings  # noqa: E402
from whitenoise import WhiteNoise  # noqa: E402

application = WhiteNoise(application)
application.add_files(str(settings.MEDIA_ROOT), prefix="media/")
