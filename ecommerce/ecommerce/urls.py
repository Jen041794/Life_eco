from django.conf import settings
from django.urls import path, include, re_path
from django.views.static import serve
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

# 商品圖片已 commit 進 git，會跟著 repo 一起部署上去。
# 注意：Django 的 static() helper 在 DEBUG=False 時不作用，所以這裡用 serve()
# 直接提供 media，讓正式環境（DEBUG 關掉）也讀得到圖片。
# 作品集 demo 這樣足夠；若是高流量正式站，建議改用雲端物件儲存 / CDN。
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
