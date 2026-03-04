"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from blog.admin import admin_site
from django.views.generic import RedirectView
from rest_framework import routers
from blog import views as blog_views
from rest_framework_simplejwt.views import (
    # keep imported in case other endpoints need them
    TokenVerifyView,
)
from blog.views import (
    CookieTokenObtainPairView, CookieTokenRefreshView, LogoutView,
    MeView, ProfileView, AvatarUploadView, FollowView,
    NotificationListView, NotificationMarkReadView, UpdateProfileView,
    WSTokenView,
)

router = routers.DefaultRouter()
router.register(r'users', blog_views.UserViewSet)
router.register(r'categories', blog_views.CategoryViewSet)
router.register(r'tags', blog_views.TagViewSet)
router.register(r'posts', blog_views.PostViewSet)
router.register(r'comments', blog_views.CommentViewSet)

urlpatterns = [
    path('', RedirectView.as_view(url='/api/', permanent=False)),
    path('admin/', admin_site.urls),
    path('api/', include(router.urls)),
    path('api/auth/token/', CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),
    path('api/auth/me/', MeView.as_view(), name='me'),
    path('api/auth/me/update/', UpdateProfileView.as_view(), name='update_profile'),
    path('api/auth/avatar/', AvatarUploadView.as_view(), name='avatar_upload'),
    path('api/profile/<str:username>/', ProfileView.as_view(), name='profile'),
    path('api/follow/<str:username>/', FollowView.as_view(), name='follow'),
    path('api/notifications/', NotificationListView.as_view(), name='notifications'),
    path('api/notifications/read/', NotificationMarkReadView.as_view(), name='notifications_read'),
    path('api/auth/ws-token/', WSTokenView.as_view(), name='ws_token'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
