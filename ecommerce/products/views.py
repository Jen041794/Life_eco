from rest_framework import viewsets, permissions, filters
from rest_framework.exceptions import ValidationError

from .models import Product, ProductImage
from .serializers import ProductSerializer

MAX_IMAGES = 3


class IsAdminOrReadOnly(permissions.BasePermission):
    """讀取(GET/HEAD/OPTIONS)所有人都可以；新增/修改/刪除只有管理員(is_staff)。"""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class ProductViewSet(viewsets.ModelViewSet):
    """商品 CRUD。一般使用者只能瀏覽，管理員可以維護商品。
    圖片用 multipart 上傳，欄位名 images（最多 3 張）。"""

    queryset = Product.objects.all().order_by("-created_at")
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]

    # 支援 ?search=關鍵字 搜尋商品名稱與說明、?ordering=price 排序
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["price", "created_at"]

    def _images_from_request(self):
        files = self.request.FILES.getlist("images")
        if len(files) > MAX_IMAGES:
            raise ValidationError(f"每個商品最多只能上傳 {MAX_IMAGES} 張圖片。")
        return files

    def perform_create(self, serializer):
        files = self._images_from_request()
        product = serializer.save()
        for f in files:
            ProductImage.objects.create(product=product, image=f)

    def perform_update(self, serializer):
        files = self._images_from_request()
        product = serializer.save()
        # 編輯時若有上傳新圖，視為「整批取代」舊圖；沒上傳則保留原圖
        if files:
            product.images.all().delete()
            for f in files:
                ProductImage.objects.create(product=product, image=f)
