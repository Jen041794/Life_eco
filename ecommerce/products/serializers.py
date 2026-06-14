from rest_framework import serializers
from products.models import Product, ProductImage, Category


class CategorySerializer(serializers.ModelSerializer):
    # 該分類底下有幾個商品，方便後台顯示與避免誤刪
    product_count = serializers.IntegerField(source="products.count", read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'product_count']


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image']


#商品序列化器
class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    # 寫入時帶 category（分類 id，可為 null）；讀取時額外回 category_name 方便前端顯示
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), allow_null=True, required=False
    )
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'stock',
            'category', 'category_name', 'is_active',
            'created_at', 'images',
        ]
