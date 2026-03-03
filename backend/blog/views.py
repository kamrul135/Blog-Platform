from rest_framework import viewsets, permissions, filters, status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings as jwt_settings
from django.utils.translation import gettext_lazy as _


class CookieJWTAuthentication(JWTAuthentication):
    """Read the JWT access token from HttpOnly cookie instead of header."""
    def get_raw_token(self, header):
        # ignore header, read from cookie
        raw_token = self.request.COOKIES.get(jwt_settings.AUTH_COOKIE)
        return raw_token
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.middleware import csrf

from .models import User, Category, Tag, Post, Comment
from .serializers import (
    UserSerializer,
    CategorySerializer,
    TagSerializer,
    PostSerializer,
    CommentSerializer,
)


class CookieTokenObtainPairView(TokenObtainPairView):
    # issue tokens and set as HttpOnly cookie
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            data = response.data
            access = data.get('access')
            refresh = data.get('refresh')
            # set cookies
            response.set_cookie(
                'access_token', access,
                httponly=True, secure=True, samesite='Lax'
            )
            response.set_cookie(
                'refresh_token', refresh,
                httponly=True, secure=True, samesite='Lax'
            )
            # include CSRF token
            response.set_cookie('csrftoken', csrf.get_token(request))
        return response


class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            access = response.data.get('access')
            response.set_cookie(
                'access_token', access,
                httponly=True, secure=True, samesite='Lax'
            )
        return response


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        # allow anyone to create a new user; other actions require admin
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = "slug"
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = "slug"
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]


class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.select_related("author", "category").prefetch_related("tags", "comments").all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "content"]
    ordering_fields = ["created", "updated"]
    lookup_field = "slug"

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_authenticated:
            return qs
        return qs.filter(status="published")


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.select_related("author", "post").all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
