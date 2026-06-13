from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, OrderItemViewSet

router = DefaultRouter()
router.register(r'items', OrderItemViewSet)
router.register(r'', OrderViewSet)
urlpatterns = router.urls