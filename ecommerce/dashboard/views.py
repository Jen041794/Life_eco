from decimal import Decimal

from django.contrib.auth.models import User
from django.db.models import Count, Sum
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order
from payments.models import Payment
from products.models import Product

# 庫存低於這個數量就算「低庫存」，提醒管理員補貨
LOW_STOCK_THRESHOLD = 5


class AdminStatsView(APIView):
    """GET /api/admin/stats/ — 後台儀表板總覽（僅管理員）。"""

    permission_classes = [IsAdminUser]

    def get(self, request):
        # 各狀態訂單數：先撈出有資料的，再補上數量為 0 的狀態，確保每個狀態都有 key
        counted = {
            row["status"]: row["c"]
            for row in Order.objects.values("status").annotate(c=Count("id"))
        }
        orders_by_status = {s.value: counted.get(s.value, 0) for s in Order.Status}

        # 總營收：成功（未退款）的付款金額加總
        revenue = (
            Payment.objects.filter(status=Payment.Status.SUCCESS)
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0")
        )

        # 低庫存商品清單
        low_stock = [
            {"id": p.id, "name": p.name, "stock": p.stock}
            for p in Product.objects.filter(stock__lt=LOW_STOCK_THRESHOLD).order_by("stock")
        ]

        return Response({
            "total_orders": Order.objects.count(),
            "orders_by_status": orders_by_status,
            "total_revenue": f"{revenue:.2f}",
            "total_users": User.objects.count(),
            "product_count": Product.objects.count(),
            "low_stock_threshold": LOW_STOCK_THRESHOLD,
            "low_stock_products": low_stock,
        })
