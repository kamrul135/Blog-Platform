from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.text import slugify
import bleach
import re


def avatar_upload_path(instance, filename):
    """Store avatars at media/avatars/<username>.<ext>"""
    ext = filename.rsplit('.', 1)[-1].lower()
    return f"avatars/{instance.username}.{ext}"


class User(AbstractUser):
    avatar = models.ImageField(
        upload_to=avatar_upload_path,
        blank=True, null=True,
        help_text="Profile picture",
    )
    bio = models.TextField(blank=True, default="")
    website = models.URLField(blank=True, default="")
    twitter = models.CharField(max_length=100, blank=True, default="")
    github = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        swappable = 'AUTH_USER_MODEL'

    groups = models.ManyToManyField(
        'auth.Group', related_name='blog_user_set', blank=True,
        help_text='The groups this user belongs to.', verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission', related_name='blog_user_set', blank=True,
        help_text='Specific permissions for this user.', verbose_name='user permissions',
    )

    @property
    def followers_count(self):
        return self.followers.count()

    @property
    def following_count(self):
        return self.following.count()


class Follow(models.Model):
    follower = models.ForeignKey(User, related_name='following', on_delete=models.CASCADE)
    following = models.ForeignKey(User, related_name='followers', on_delete=models.CASCADE)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')
        ordering = ['-created']

    def __str__(self):
        return f"{self.follower} → {self.following}"


class Notification(models.Model):
    VERB_CHOICES = (
        ('like', 'liked your post'),
        ('comment', 'commented on your post'),
        ('follow', 'started following you'),
    )
    recipient = models.ForeignKey(User, related_name='notifications', on_delete=models.CASCADE)
    actor = models.ForeignKey(User, related_name='sent_notifications', on_delete=models.CASCADE)
    verb = models.CharField(max_length=20, choices=VERB_CHOICES)
    post = models.ForeignKey('Post', null=True, blank=True, on_delete=models.CASCADE)
    read = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created']

    def __str__(self):
        return f"{self.actor} {self.verb} → {self.recipient}"



class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)

    class Meta:
        ordering = ["name"]
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True, blank=True)

    class Meta:
        ordering = ["name"]
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Post(models.Model):
    STATUS_CHOICES = (
        ("draft", "Draft"),
        ("published", "Published"),
    )

    author = models.ForeignKey(
        User, related_name="posts", on_delete=models.CASCADE
    )
    title = models.CharField(max_length=250)
    slug = models.SlugField(max_length=250, unique=True, blank=True)
    content = models.TextField()
    category = models.ForeignKey(
        Category, related_name="posts", on_delete=models.SET_NULL, null=True
    )
    tags = models.ManyToManyField(Tag, related_name="posts", blank=True)
    likes = models.ManyToManyField(
        'User', related_name="liked_posts", blank=True
    )
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="draft"
    )
    view_count = models.PositiveIntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created"]

    def save(self, *args, **kwargs):
        # sanitize rich text content before saving
        if self.content:
            self.content = bleach.clean(
                self.content,
                tags=[
                    'p', 'b', 'i', 'u', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br',
                    'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    'img',
                ],
                attributes={
                    'a': ['href', 'title', 'target'],
                    'img': ['src', 'alt'],
                },
                strip=True,
            )
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while Post.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    @property
    def reading_time(self):
        """Estimate reading time in minutes (avg 200 wpm)."""
        plain = re.sub(r'<[^>]+>', '', self.content or '')
        word_count = len(plain.split())
        minutes = max(1, round(word_count / 200))
        return minutes


class Comment(models.Model):
    post = models.ForeignKey(
        Post, related_name="comments", on_delete=models.CASCADE
    )
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    body = models.TextField()
    created = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["created"]

    def __str__(self):
        return f"Comment by {self.author} on {self.post}"
