import csv
from django.contrib import admin
from django.contrib.admin import AdminSite
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.db.models import Count
from django.http import HttpResponse
from django.urls import path
from django.utils.html import format_html
from django.utils.timezone import now
from datetime import timedelta

from .models import User, Category, Tag, Post, Comment


# ─────────────────────────────────────────────
# Custom Admin Site with dashboard statistics
# ─────────────────────────────────────────────
class BlogAdminSite(AdminSite):
    site_header = "✍ Blog Platform Admin"
    site_title  = "Blog Admin"
    index_title = "Dashboard Overview"

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path("export-stats/", self.admin_view(self.stats_csv_view), name="export_stats"),
        ]
        return custom + urls

    def index(self, request, extra_context=None):
        """Inject platform-wide stats into the admin dashboard."""
        seven_days_ago  = now() - timedelta(days=7)
        thirty_days_ago = now() - timedelta(days=30)

        stats = {
            "total_posts"      : Post.objects.count(),
            "published_posts"  : Post.objects.filter(status="published").count(),
            "draft_posts"      : Post.objects.filter(status="draft").count(),
            "total_comments"   : Comment.objects.count(),
            "pending_comments" : Comment.objects.filter(active=False).count(),
            "total_users"      : User.objects.count(),
            "active_users"     : User.objects.filter(is_active=True).count(),
            "new_posts_7d"     : Post.objects.filter(created__gte=seven_days_ago).count(),
            "new_users_30d"    : User.objects.filter(date_joined__gte=thirty_days_ago).count(),
            "total_views"      : sum(p.view_count for p in Post.objects.only("view_count")),
            "top_posts"        : Post.objects.filter(status="published").order_by("-view_count")[:5],
            "most_liked"       : Post.objects.annotate(lc=Count("likes"))
                                     .filter(status="published").order_by("-lc")[:5],
            "recent_comments"  : Comment.objects.select_related("author", "post").order_by("-created")[:5],
        }
        extra_context = extra_context or {}
        extra_context.update(stats)
        return super().index(request, extra_context)

    def stats_csv_view(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="blog_stats.csv"'
        writer = csv.writer(response)
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Total Posts",    Post.objects.count()])
        writer.writerow(["Published",      Post.objects.filter(status="published").count()])
        writer.writerow(["Drafts",         Post.objects.filter(status="draft").count()])
        writer.writerow(["Total Comments", Comment.objects.count()])
        writer.writerow(["Total Users",    User.objects.count()])
        writer.writerow(["Total Views",    sum(p.view_count for p in Post.objects.only("view_count"))])
        return response


admin_site = BlogAdminSite(name="blog_admin")


# ─────────────────────────────────────────────
# Inline: Comments inside Post detail
# ─────────────────────────────────────────────
class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0
    fields = ("author", "body", "active", "created")
    readonly_fields = ("author", "body", "created")
    show_change_link = True


# ─────────────────────────────────────────────
# Actions
# ─────────────────────────────────────────────
@admin.action(description="Mark selected as Published")
def make_published(modeladmin, request, queryset):
    updated = queryset.update(status="published")
    modeladmin.message_user(request, f"{updated} post(s) marked as Published.")


@admin.action(description="Move selected to Draft")
def make_draft(modeladmin, request, queryset):
    updated = queryset.update(status="draft")
    modeladmin.message_user(request, f"{updated} post(s) moved to Draft.")


@admin.action(description="Export selected posts to CSV")
def export_posts_csv(modeladmin, request, queryset):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="posts.csv"'
    writer = csv.writer(response)
    writer.writerow(["ID", "Title", "Author", "Status", "Category",
                     "Views", "Likes", "Reading Time (min)", "Created"])
    for post in queryset.select_related("author", "category").annotate(lc=Count("likes")):
        writer.writerow([
            post.id, post.title, post.author.username,
            post.status, post.category.name if post.category else "—",
            post.view_count, post.lc, post.reading_time, post.created,
        ])
    return response


@admin.action(description="Approve selected comments")
def approve_comments(modeladmin, request, queryset):
    updated = queryset.update(active=True)
    modeladmin.message_user(request, f"{updated} comment(s) approved.")


@admin.action(description="Reject / hide selected comments")
def reject_comments(modeladmin, request, queryset):
    updated = queryset.update(active=False)
    modeladmin.message_user(request, f"{updated} comment(s) hidden.")


# ─────────────────────────────────────────────
# User Admin
# ─────────────────────────────────────────────
@admin.register(User, site=admin_site)
class UserAdmin(BaseUserAdmin):
    list_display    = ("username", "email", "post_count", "is_active",
                       "is_staff", "last_login", "date_joined")
    list_filter     = ("is_active", "is_staff", "is_superuser", "date_joined")
    search_fields   = ("username", "email", "first_name", "last_name")
    ordering        = ("-date_joined",)
    readonly_fields = ("last_login", "date_joined", "post_count_ro")

    fieldsets = BaseUserAdmin.fieldsets + (
        ("Blog Stats", {"fields": ("post_count_ro",)}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(num_posts=Count("posts"))

    @admin.display(description="Posts", ordering="num_posts")
    def post_count(self, obj):
        count = obj.num_posts
        color = "#16a34a" if count > 0 else "#9ca3af"
        return format_html('<b style="color:{}">{}</b>', color, count)

    @admin.display(description="Total Posts Written")
    def post_count_ro(self, obj):
        return obj.posts.count()


# ─────────────────────────────────────────────
# Category Admin
# ─────────────────────────────────────────────
@admin.register(Category, site=admin_site)
class CategoryAdmin(admin.ModelAdmin):
    list_display        = ("name", "slug", "post_count")
    search_fields       = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    ordering            = ("name",)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(num_posts=Count("posts"))

    @admin.display(description="# Posts", ordering="num_posts")
    def post_count(self, obj):
        return obj.num_posts


# ─────────────────────────────────────────────
# Tag Admin
# ─────────────────────────────────────────────
@admin.register(Tag, site=admin_site)
class TagAdmin(admin.ModelAdmin):
    list_display        = ("name", "slug", "post_count")
    search_fields       = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    ordering            = ("name",)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(num_posts=Count("posts"))

    @admin.display(description="# Posts", ordering="num_posts")
    def post_count(self, obj):
        return obj.num_posts


# ─────────────────────────────────────────────
# Post Admin
# ─────────────────────────────────────────────
@admin.register(Post, site=admin_site)
class PostAdmin(admin.ModelAdmin):
    list_display        = ("title", "author_link", "status_badge", "category",
                           "view_count", "likes_count", "reading_time_col", "created")
    list_filter         = ("status", "category", "tags", "created", "author")
    search_fields       = ("title", "content", "author__username", "category__name")
    prepopulated_fields = {"slug": ("title",)}
    date_hierarchy      = "created"
    ordering            = ("-created",)
    actions             = [make_published, make_draft, export_posts_csv]
    filter_horizontal   = ("tags", "likes")
    readonly_fields     = ("view_count", "likes_count", "reading_time_col",
                           "slug", "created", "updated")
    list_per_page       = 20

    fieldsets = (
        ("Content", {
            "fields": ("title", "slug", "author", "content"),
        }),
        ("Organisation", {
            "fields": ("status", "category", "tags"),
        }),
        ("Statistics", {
            "classes": ("collapse",),
            "fields": ("view_count", "likes_count", "reading_time_col", "created", "updated"),
        }),
        ("Likes (Users)", {
            "classes": ("collapse",),
            "fields": ("likes",),
        }),
    )

    inlines = [CommentInline]

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(lc=Count("likes"))

    @admin.display(description="Author")
    def author_link(self, obj):
        return format_html(
            '<a href="../user/{}/change/">{}</a>', obj.author.pk, obj.author.username
        )

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        color = "#16a34a" if obj.status == "published" else "#d97706"
        label = obj.status.capitalize()
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;'
            'border-radius:12px;font-size:11px;font-weight:700">{}</span>',
            color, label,
        )

    @admin.display(description="❤ Likes", ordering="lc")
    def likes_count(self, obj):
        return obj.lc

    @admin.display(description="⏱ Read")
    def reading_time_col(self, obj):
        return f"{obj.reading_time} min"


# ─────────────────────────────────────────────
# Comment Admin
# ─────────────────────────────────────────────
@admin.register(Comment, site=admin_site)
class CommentAdmin(admin.ModelAdmin):
    list_display    = ("short_body", "author", "post_link", "status_badge", "created")
    list_filter     = ("active", "created")
    search_fields   = ("body", "author__username", "post__title")
    ordering        = ("-created",)
    actions         = [approve_comments, reject_comments]
    readonly_fields = ("created",)
    list_per_page   = 25

    fieldsets = (
        (None, {"fields": ("post", "author", "body", "active", "created")}),
    )

    @admin.display(description="Comment")
    def short_body(self, obj):
        return (obj.body[:70] + "…") if len(obj.body) > 70 else obj.body

    @admin.display(description="Post")
    def post_link(self, obj):
        return format_html(
            '<a href="../post/{}/change/">{}</a>',
            obj.post.pk, obj.post.title[:45]
        )

    @admin.display(description="Status")
    def status_badge(self, obj):
        if obj.active:
            return format_html('<span style="color:#16a34a;font-weight:700">✔ Active</span>')
        return format_html('<span style="color:#dc2626;font-weight:700">✘ Hidden</span>')
