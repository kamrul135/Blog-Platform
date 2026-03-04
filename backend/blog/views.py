from rest_framework.views import APIView
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.middleware import csrf
from django.shortcuts import get_object_or_404
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import User, Category, Tag, Post, Comment, Follow, Notification
from .serializers import (
    UserSerializer,
    CategorySerializer,
    TagSerializer,
    PostSerializer,
    CommentSerializer,
    FollowSerializer,
    NotificationSerializer,
)
from .permissions import IsAuthorOrReadOnly
from .authentication import CookieJWTAuthentication


def _push_notification(notification_obj):
    """
    Push a newly-created Notification to the recipient's WebSocket group.
    Safe to call from sync Django views â€“ errors are swallowed silently.
    """
    try:
        channel_layer = get_channel_layer()
        actor = notification_obj.actor
        post = notification_obj.post
        avatar_url = None
        if actor.avatar:
            avatar_url = actor.avatar.url  # relative â€“ frontend prefixes host
        async_to_sync(channel_layer.group_send)(
            f"notifications_{notification_obj.recipient_id}",
            {
                "type": "notification.message",
                "data": {
                    "id": notification_obj.id,
                    "actor": {"username": actor.username, "avatar": avatar_url},
                    "verb": notification_obj.verb,
                    "post_slug": post.slug if post else None,
                    "post_title": post.title if post else None,
                    "read": False,
                    "created": notification_obj.created.isoformat(),
                },
            },
        )
    except Exception:
        pass  # never break a request because of a push failure


class WSTokenView(APIView):
    """Return the raw access token so the frontend can open an authenticated WebSocket."""
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        token = request.COOKIES.get("access_token", "")
        return Response({"token": token})


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


class MeView(APIView):
    """Return the currently authenticated user's full info."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        avatar_url = None
        if user.avatar:
            avatar_url = request.build_absolute_uri(user.avatar.url)
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'avatar': avatar_url,
            'bio': user.bio,
            'website': user.website,
            'twitter': user.twitter,
            'github': user.github,
            'followers_count': user.followers.count(),
            'following_count': user.following.count(),
        })


class UpdateProfileView(APIView):
    """Update the authenticated user's bio and social links."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        user = request.user
        allowed = ['bio', 'website', 'twitter', 'github', 'email']
        for field in allowed:
            if field in request.data:
                setattr(user, field, request.data[field])
        # Password change
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        if old_password and new_password:
            if not user.check_password(old_password):
                return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(new_password)
        user.save()
        avatar_url = None
        if user.avatar:
            avatar_url = request.build_absolute_uri(user.avatar.url)
        return Response({
            'id': user.id, 'username': user.username, 'email': user.email,
            'avatar': avatar_url, 'bio': user.bio, 'website': user.website,
            'twitter': user.twitter, 'github': user.github,
        })


class AvatarUploadView(APIView):
    """Upload or replace the authenticated user's profile picture."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('avatar')
        if not file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        if not file.content_type.startswith('image/'):
            return Response({'error': 'File must be an image.'}, status=status.HTTP_400_BAD_REQUEST)
        if file.size > 5 * 1024 * 1024:
            return Response({'error': 'File size must be under 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        if user.avatar:
            user.avatar.delete(save=False)
        user.avatar = file
        user.save()
        avatar_url = request.build_absolute_uri(user.avatar.url)
        return Response({'avatar': avatar_url}, status=status.HTTP_200_OK)


class ProfileView(APIView):
    """Return a user's public profile, posts, and follow status."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        user = get_object_or_404(User, username=username)
        posts = Post.objects.filter(author=user, status='published').order_by('-created')
        serializer = PostSerializer(posts, many=True, context={'request': request})
        avatar_url = None
        if user.avatar:
            avatar_url = request.build_absolute_uri(user.avatar.url)
        is_following = False
        if request.user.is_authenticated and request.user != user:
            is_following = Follow.objects.filter(follower=request.user, following=user).exists()
        return Response({
            'id': user.id,
            'username': user.username,
            'date_joined': user.date_joined,
            'avatar': avatar_url,
            'bio': user.bio,
            'website': user.website,
            'twitter': user.twitter,
            'github': user.github,
            'followers_count': user.followers.count(),
            'following_count': user.following.count(),
            'is_following': is_following,
            'posts': serializer.data,
        })


class FollowView(APIView):
    """Follow or unfollow a user. POST to toggle."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        target = get_object_or_404(User, username=username)
        if target == request.user:
            return Response({'error': 'You cannot follow yourself.'}, status=status.HTTP_400_BAD_REQUEST)
        follow, created = Follow.objects.get_or_create(follower=request.user, following=target)
        if not created:
            follow.delete()
            following = False
        else:
            following = True
            # Create notification
            notif, created = Notification.objects.get_or_create(
                recipient=target, actor=request.user, verb='follow', post=None
            )
            if created:
                _push_notification(notif)
        return Response({
            'following': following,
            'followers_count': target.followers.count(),
        })


class NotificationListView(APIView):
    """List all notifications for the authenticated user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        notifs = Notification.objects.filter(recipient=request.user).select_related('actor', 'post')[:50]
        serializer = NotificationSerializer(notifs, many=True, context={'request': request})
        unread_count = Notification.objects.filter(recipient=request.user, read=False).count()
        return Response({'results': serializer.data, 'unread_count': unread_count})


class NotificationMarkReadView(APIView):
    """Mark all notifications as read."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(recipient=request.user, read=False).update(read=True)
        return Response({'detail': 'All notifications marked as read.'})


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

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        Post.objects.filter(pk=instance.pk).update(view_count=instance.view_count + 1)
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, slug=None):
        post = self.get_object()
        user = request.user
        if post.likes.filter(pk=user.pk).exists():
            post.likes.remove(user)
            liked = False
        else:
            post.likes.add(user)
            liked = True
            # Create like notification and push via WebSocket
            if post.author != user:
                notif, created = Notification.objects.get_or_create(
                    recipient=post.author, actor=user, verb='like', post=post
                )
                if created:
                    _push_notification(notif)
        return Response({'liked': liked, 'likes_count': post.likes.count()})

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
        comment = serializer.save(author=self.request.user)
        # Create comment notification and push via WebSocket
        if comment.post.author != self.request.user:
            notif, created = Notification.objects.get_or_create(
                recipient=comment.post.author,
                actor=self.request.user,
                verb='comment',
                post=comment.post,
            )
            if created:
                _push_notification(notif)

    def get_queryset(self):
        qs = super().get_queryset()
        post_slug = self.request.query_params.get('post')
        if post_slug:
            qs = qs.filter(post__slug=post_slug, active=True)
        return qs



