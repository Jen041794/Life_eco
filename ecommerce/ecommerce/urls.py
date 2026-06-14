from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include, re_path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework import permissions
from drf_yasg.views import get_schema_view

from drf_yasg import openapi
from rest_framework.routers import DefaultRouter
from products.views import CategoryViewSet

# 分類路由獨立掛在 /api/categories/，不 nest 進 products 的 r'' 以免撞 detail route
category_router = DefaultRouter()
category_router.register(r'categories', CategoryViewSet)

schema_view = get_schema_view(
    openapi.Info(
        title="Ecommerce API",
        default_version= "V1",
        description="API 文件 for 商品、訂單、付款、使用者"
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [

    #各app的api路由
    path("api/", include(category_router.urls)),
    path("api/products/", include('products.urls')),
    path("api/orders/", include('orders.urls')),
    path("api/payments/", include('payments.urls')),
    path("api/user/", include('user.urls')),
    path("api/admin/", include('dashboard.urls')),

    #JWT 認證
    path("api/token/", TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path("api/token/refresh/", TokenRefreshView.as_view(), name='refresh'),

    #swagger文件
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0)),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc')
]

# 開發階段讓 Django 直接 serve 上傳的圖片（正式環境會交給 nginx / 雲端）
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
