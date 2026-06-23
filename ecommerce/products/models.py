from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class Category(models.Model):
    """商品分類（獨立資料表，管理員可後台自由新增/改名/刪除）。"""
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    class Tag(models.TextChoices):
        NEW = "新商品", "新商品"
        LIMITED = "限量倒數", "限量倒數"
        HOT = "熱賣", "熱賣"

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    category = models.ForeignKey(
        Category, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="products",
    )
    # 上下架開關：False 代表下架，前台顧客看不到，但後台管理員仍可見
    is_active = models.BooleanField(default=True)
    # 行銷標籤：空字串＝不顯示；有值時前台卡片左上角會出現斜絲帶
    tag = models.CharField(max_length=20, blank=True, default="", choices=Tag.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    """一個商品最多 3 張圖（數量限制在 serializer/view 把關）。"""
    product = models.ForeignKey(Product, related_name="images", on_delete=models.CASCADE)
    image = models.ImageField(upload_to="products/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.product.name} 的圖片 #{self.id}"