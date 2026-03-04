from rest_framework import serializers

from .models import User, Category, Tag, Post, Comment, Follow, Notification


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    avatar_url = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "password", "avatar_url",
            "bio", "website", "twitter", "github",
            "followers_count", "following_count",
        ]
        extra_kwargs = {"password": {"write_only": True}}

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.following.count()

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user


class FollowSerializer(serializers.ModelSerializer):
    follower = UserSerializer(read_only=True)
    following = UserSerializer(read_only=True)

    class Meta:
        model = Follow
        fields = ["id", "follower", "following", "created"]


class NotificationSerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()
    post_slug = serializers.SerializerMethodField()
    post_title = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ["id", "actor", "verb", "post_slug", "post_title", "read", "created"]

    def get_actor(self, obj):
        request = self.context.get('request')
        avatar_url = None
        if obj.actor.avatar:
            avatar_url = request.build_absolute_uri(obj.actor.avatar.url) if request else obj.actor.avatar.url
        return {"username": obj.actor.username, "avatar": avatar_url}

    def get_post_slug(self, obj):
        return obj.post.slug if obj.post else None

    def get_post_title(self, obj):
        return obj.post.title if obj.post else None



class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name", "slug"]


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "post", "author", "body", "created", "active"]
        read_only_fields = ["id", "created", "author"]


class PostSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    reading_time = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id", "author", "title", "slug", "content",
            "category", "tags", "status",
            "view_count", "likes_count", "is_liked", "reading_time",
            "created", "updated", "comments",
        ]
        read_only_fields = ["id", "slug", "created", "updated", "author",
                            "view_count", "likes_count", "is_liked", "reading_time"]

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.likes.filter(pk=request.user.pk).exists()
        return False

    def get_reading_time(self, obj):
        return obj.reading_time
