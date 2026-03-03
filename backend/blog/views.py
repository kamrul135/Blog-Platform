from rest_framework.views import APIView
from rest_framework import viewsets, permissions, filters, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.middleware import csrf

from .models import User, Category, Tag, Post, Comment
from .serializers import (
    UserSerializer,
    CategorySerializer,
    TagSerializer,
    PostSerializer,
    CommentSerializer,
)
from .permissions import IsAuthorOrReadOnly


class CookieTokenObtainPairView(TokenObtainPairView):
    """Login: issue tokens as HttpOnly cookies."""
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            access = response.data.get('access')
            refresh = response.data.get('refresh')
            response.set_cookie('access_token', access, httponly=True, secure=False, samesite='Lax')
            response.set_cookie('refresh_token', refresh, httponly=True, secure=False, samesite='Lax')
            response.set_cookie('csrftoken', csrf.get_token(request))
        return response


class CookieTokenRefreshView(TokenRefreshView):
    """Refresh access token, reading refresh token from cookie."""
    def post(self, request, *args, **kwargs):
        if 'refresh' not in request.data:
            refresh_cookie = request.COOKIES.get('refresh_token')
            if refresh_cookie:
                request.data['refresh'] = refresh_cookie
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            access = response.data.get('access')
            response.set_cookie('access_token', access, httponly=True, secure=False, samesite='Lax')
        return response


class LogoutView(APIView):
    """Clear all auth cookies on logout."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        response = Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)
        response.delete_cookie('access_token')
        response.delete_cookie('refresh_token')
        response.delete_cookie('csrftoken')
        return response


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
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
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "content"]
    ordering_fields = ["created", "updated"]
    lookup_field = "slug"

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('mine') == 'true' and self.request.user.is_authenticated:
            return qs.filter(author=self.request.user)
        if self.request.user.is_authenticated:
            return qs
        return qs.filter(status="published")


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.select_related("author", "post").all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        post_slug = self.request.query_params.get('post')
        if post_slug:
            qs = qs.filter(post__slug=post_slug, active=True)
        return qs
