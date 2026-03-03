from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.text import slugify
import bleach
import re


class User(AbstractUser):
    # can be extended later with profile fields
    
    class Meta:
        # ensure Django knows this is the swappable user model
        swappable = 'AUTH_USER_MODEL'

    # avoid reverse accessor clashes with default auth.User
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='blog_user_set',
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='blog_user_set',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True, blank=True)

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
            self.slug = slugify(self.title)
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
