from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, MyProfileView, RegisterView, LoginView

router = DefaultRouter()
router.register(r'', UserViewSet)
# 注意：profile/ 要放在 router.urls 之前，否則會被 r'' 的 detail route 吃掉
urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('profile/', MyProfileView.as_view(), name='my-profile'),
]

urlpatterns += router.urls