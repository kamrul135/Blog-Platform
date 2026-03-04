"""
End-to-end API test suite for the Blog Platform backend.
Covers: Auth, Users/Profile, Categories, Tags, Posts, Likes,
        View Count, Reading Time, Comments, Permissions, Admin.
"""
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from .models import User, Category, Tag, Post, Comment


# ──────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────
def make_user(username="testuser", password="pass1234!", email="test@example.com", **kw):
    return User.objects.create_user(username=username, password=password, email=email, **kw)


def make_category(name="Tech"):
    return Category.objects.create(name=name)


def make_tag(name="Python"):
    return Tag.objects.create(name=name)


def make_post(author, title="Hello World", status_val="published", category=None):
    p = Post(author=author, title=title, content="<p>Body text for testing.</p>",
             status=status_val, category=category)
    p.save()
    return p


# ──────────────────────────────────────────────────────────
# 1. Authentication
# ──────────────────────────────────────────────────────────
class AuthTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = make_user()

    # --- Registration ---
    def test_register_success(self):
        res = self.client.post("/api/users/", {
            "username": "newuser", "email": "new@test.com", "password": "pass1234!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="newuser").exists())

    def test_register_duplicate_username(self):
        res = self.client.post("/api/users/", {
            "username": "testuser", "email": "dup@test.com", "password": "pass1234!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_password(self):
        res = self.client.post("/api/users/", {
            "username": "nopass", "email": "nopass@test.com"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Login ---
    def test_login_success_sets_cookies(self):
        res = self.client.post("/api/auth/token/", {
            "username": "testuser", "password": "pass1234!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", res.cookies)
        self.assertIn("refresh_token", res.cookies)

    def test_login_wrong_password(self):
        res = self.client.post("/api/auth/token/", {
            "username": "testuser", "password": "wrongpass"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        res = self.client.post("/api/auth/token/", {
            "username": "nobody", "password": "pass1234!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Me endpoint ---
    def test_me_unauthenticated(self):
        res = self.client.get("/api/auth/me/")
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_me_authenticated(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get("/api/auth/me/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["username"], "testuser")
        self.assertIn("id", res.data)
        self.assertIn("email", res.data)
        self.assertNotIn("password", res.data)

    # --- Logout ---
    def test_logout_authenticated(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/api/auth/logout/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_logout_unauthenticated(self):
        res = self.client.post("/api/auth/logout/")
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))


# ──────────────────────────────────────────────────────────
# 2. Public Profile
# ──────────────────────────────────────────────────────────
class ProfileTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.author = make_user(username="author1")
        self.post = make_post(self.author, title="Profile Post")

    def test_profile_returns_user_and_posts(self):
        res = self.client.get("/api/profile/author1/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["username"], "author1")
        self.assertEqual(len(res.data["posts"]), 1)

    def test_profile_only_published_posts(self):
        make_post(self.author, title="Draft Post", status_val="draft")
        res = self.client.get("/api/profile/author1/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["posts"]), 1)  # only published

    def test_profile_not_found(self):
        res = self.client.get("/api/profile/nobody/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


# ──────────────────────────────────────────────────────────
# 3. Categories
# ──────────────────────────────────────────────────────────
class CategoryTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = make_user(username="admin", is_staff=True, is_superuser=True)
        self.cat = make_category("Science")

    def test_list_categories_anonymous(self):
        res = self.client.get("/api/categories/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_create_category_authenticated(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post("/api/categories/", {"name": "Tech"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Category.objects.filter(name="Tech").exists())

    def test_slug_auto_generated(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post("/api/categories/", {"name": "My Category"}, format="json")
        self.assertEqual(res.data["slug"], "my-category")

    def test_create_category_unauthenticated(self):
        res = self.client.post("/api/categories/", {"name": "Fail"}, format="json")
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))


# ──────────────────────────────────────────────────────────
# 4. Tags
# ──────────────────────────────────────────────────────────
class TagTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = make_user()

    def test_list_tags_anonymous(self):
        make_tag("Django")
        res = self.client.get("/api/tags/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_create_tag_authenticated(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/api/tags/", {"name": "FastAPI"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_tag_slug_auto_generated(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/api/tags/", {"name": "Next JS"}, format="json")
        self.assertEqual(res.data["slug"], "next-js")


# ──────────────────────────────────────────────────────────
# 5. Posts — CRUD
# ──────────────────────────────────────────────────────────
class PostCRUDTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.author = make_user(username="author")
        self.other  = make_user(username="other", email="other@test.com")
        self.cat    = make_category()
        self.post   = make_post(self.author, title="First Post")

    def test_list_posts_public(self):
        res = self.client.get("/api/posts/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data["results"]), 1)

    def test_retrieve_post_by_slug(self):
        res = self.client.get(f"/api/posts/{self.post.slug}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["title"], "First Post")

    def test_create_post_authenticated(self):
        self.client.force_authenticate(user=self.author)
        res = self.client.post("/api/posts/", {
            "title": "New Post", "content": "<p>Hello</p>", "status": "draft"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["author"]["username"], "author")

    def test_create_post_unauthenticated(self):
        res = self.client.post("/api/posts/", {
            "title": "Fail", "content": "body", "status": "draft"
        }, format="json")
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_update_post_by_author(self):
        self.client.force_authenticate(user=self.author)
        res = self.client.patch(f"/api/posts/{self.post.slug}/",
                                {"title": "Updated Title"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["title"], "Updated Title")

    def test_update_post_by_non_author_forbidden(self):
        self.client.force_authenticate(user=self.other)
        res = self.client.patch(f"/api/posts/{self.post.slug}/",
                                {"title": "Hacked"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_post_by_author(self):
        self.client.force_authenticate(user=self.author)
        res = self.client.delete(f"/api/posts/{self.post.slug}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Post.objects.filter(pk=self.post.pk).exists())

    def test_delete_post_by_non_author_forbidden(self):
        self.client.force_authenticate(user=self.other)
        res = self.client.delete(f"/api/posts/{self.post.slug}/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_mine_filter(self):
        make_post(self.other, title="Other's Post")
        self.client.force_authenticate(user=self.author)
        res = self.client.get("/api/posts/?mine=true")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        usernames = [p["author"]["username"] for p in res.data["results"]]
        self.assertTrue(all(u == "author" for u in usernames))


# ──────────────────────────────────────────────────────────
# 6. Slug uniqueness
# ──────────────────────────────────────────────────────────
class SlugUniquenessTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.author = make_user(username="slugger")

    def test_duplicate_title_gets_unique_slugs(self):
        self.client.force_authenticate(user=self.author)
        res1 = self.client.post("/api/posts/",
                                {"title": "Same Title", "content": "body", "status": "draft"},
                                format="json")
        res2 = self.client.post("/api/posts/",
                                {"title": "Same Title", "content": "body", "status": "draft"},
                                format="json")
        res3 = self.client.post("/api/posts/",
                                {"title": "Same Title", "content": "body", "status": "draft"},
                                format="json")
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res3.status_code, status.HTTP_201_CREATED)
        slugs = {res1.data["slug"], res2.data["slug"], res3.data["slug"]}
        self.assertEqual(len(slugs), 3)  # all unique


# ──────────────────────────────────────────────────────────
# 7. View Count
# ──────────────────────────────────────────────────────────
class ViewCountTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.author = make_user(username="viewer")
        self.post   = make_post(self.author)

    def test_view_count_increments_on_retrieve(self):
        self.assertEqual(self.post.view_count, 0)
        self.client.get(f"/api/posts/{self.post.slug}/")
        self.post.refresh_from_db()
        self.assertEqual(self.post.view_count, 1)

    def test_view_count_increments_multiple_times(self):
        for _ in range(5):
            self.client.get(f"/api/posts/{self.post.slug}/")
        self.post.refresh_from_db()
        self.assertEqual(self.post.view_count, 5)

    def test_view_count_in_response(self):
        self.client.get(f"/api/posts/{self.post.slug}/")
        res = self.client.get(f"/api/posts/{self.post.slug}/")
        self.assertEqual(res.data["view_count"], 2)


# ──────────────────────────────────────────────────────────
# 8. Likes / Unlike
# ──────────────────────────────────────────────────────────
class LikeTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.author = make_user(username="liker")
        self.other  = make_user(username="liker2", email="liker2@test.com")
        self.post   = make_post(self.author)

    def test_like_post(self):
        self.client.force_authenticate(user=self.author)
        res = self.client.post(f"/api/posts/{self.post.slug}/like/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["liked"])
        self.assertEqual(res.data["likes_count"], 1)

    def test_unlike_post(self):
        self.client.force_authenticate(user=self.author)
        self.client.post(f"/api/posts/{self.post.slug}/like/")
        res = self.client.post(f"/api/posts/{self.post.slug}/like/")
        self.assertFalse(res.data["liked"])
        self.assertEqual(res.data["likes_count"], 0)

    def test_multiple_users_like(self):
        self.client.force_authenticate(user=self.author)
        self.client.post(f"/api/posts/{self.post.slug}/like/")
        self.client.force_authenticate(user=self.other)
        self.client.post(f"/api/posts/{self.post.slug}/like/")
        self.post.refresh_from_db()
        self.assertEqual(self.post.likes.count(), 2)

    def test_like_unauthenticated(self):
        res = self.client.post(f"/api/posts/{self.post.slug}/like/")
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_is_liked_field_in_post_detail(self):
        self.client.force_authenticate(user=self.author)
        self.client.post(f"/api/posts/{self.post.slug}/like/")
        res = self.client.get(f"/api/posts/{self.post.slug}/")
        self.assertTrue(res.data["is_liked"])

    def test_is_liked_false_for_other_user(self):
        self.client.force_authenticate(user=self.author)
        self.client.post(f"/api/posts/{self.post.slug}/like/")
        self.client.force_authenticate(user=self.other)
        res = self.client.get(f"/api/posts/{self.post.slug}/")
        self.assertFalse(res.data["is_liked"])


# ──────────────────────────────────────────────────────────
# 9. Reading Time
# ──────────────────────────────────────────────────────────
class ReadingTimeTests(TestCase):

    def setUp(self):
        self.author = make_user(username="reader")

    def test_short_content_minimum_one_minute(self):
        p = Post(author=self.author, title="Short", content="<p>Hi</p>", status="published")
        p.save()
        self.assertEqual(p.reading_time, 1)

    def test_long_content_reading_time(self):
        words = " ".join(["word"] * 400)  # 400 words → 2 minutes @ 200 wpm
        p = Post(author=self.author, title="Long Post",
                 content=f"<p>{words}</p>", status="published")
        p.save()
        self.assertEqual(p.reading_time, 2)

    def test_reading_time_in_api_response(self):
        client = APIClient()
        client.force_authenticate(user=self.author)
        client.post("/api/posts/", {
            "title": "RT Test", "content": "<p>text</p>", "status": "published"
        }, format="json")
        res = client.get("/api/posts/rt-test/")
        self.assertIn("reading_time", res.data)
        self.assertGreaterEqual(res.data["reading_time"], 1)


# ──────────────────────────────────────────────────────────
# 10. Content Sanitization (bleach)
# ──────────────────────────────────────────────────────────
class SanitizationTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.author = make_user(username="sanity")
        self.client.force_authenticate(user=self.author)

    def test_script_tags_stripped(self):
        res = self.client.post("/api/posts/", {
            "title": "XSS Test",
            "content": '<p>Hello</p><script>alert("xss")</script>',
            "status": "draft"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        post = Post.objects.get(slug="xss-test")
        self.assertNotIn("<script>", post.content)
        self.assertIn("<p>Hello</p>", post.content)

    def test_onclick_attribute_stripped(self):
        res = self.client.post("/api/posts/", {
            "title": "Attr Test",
            "content": '<p onclick="evil()">Click me</p>',
            "status": "draft"
        }, format="json")
        post = Post.objects.get(slug="attr-test")
        self.assertNotIn("onclick", post.content)


# ──────────────────────────────────────────────────────────
# 11. Comments
# ──────────────────────────────────────────────────────────
class CommentTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.author  = make_user(username="commenter")
        self.other   = make_user(username="other_c", email="oc@test.com")
        self.post    = make_post(self.author)

    def test_list_comments_for_post(self):
        Comment.objects.create(post=self.post, author=self.author, body="Nice post!")
        res = self.client.get(f"/api/comments/?post={self.post.slug}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data["results"]), 1)

    def test_create_comment_authenticated(self):
        self.client.force_authenticate(user=self.author)
        res = self.client.post("/api/comments/", {
            "post": self.post.pk, "body": "Great post!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["author"]["username"], "commenter")

    def test_create_comment_unauthenticated(self):
        res = self.client.post("/api/comments/", {
            "post": self.post.pk, "body": "fail"
        }, format="json")
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_delete_own_comment(self):
        self.client.force_authenticate(user=self.author)
        res = self.client.post("/api/comments/", {
            "post": self.post.pk, "body": "Delete me"
        }, format="json")
        comment_id = res.data["id"]
        del_res = self.client.delete(f"/api/comments/{comment_id}/")
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_other_comment_forbidden(self):
        self.client.force_authenticate(user=self.author)
        res = self.client.post("/api/comments/", {
            "post": self.post.pk, "body": "Mine"
        }, format="json")
        comment_id = res.data["id"]
        self.client.force_authenticate(user=self.other)
        del_res = self.client.delete(f"/api/comments/{comment_id}/")
        self.assertEqual(del_res.status_code, status.HTTP_403_FORBIDDEN)


# ──────────────────────────────────────────────────────────
# 12. Serializer field completeness
# ──────────────────────────────────────────────────────────
class PostSerializerTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.author = make_user(username="serial")
        self.post   = make_post(self.author)

    def test_post_detail_has_required_fields(self):
        res = self.client.get(f"/api/posts/{self.post.slug}/")
        required = {"id", "title", "slug", "content", "status", "author",
                    "view_count", "likes_count", "is_liked", "reading_time",
                    "created", "updated", "comments"}
        self.assertTrue(required.issubset(set(res.data.keys())))

    def test_author_does_not_expose_password(self):
        res = self.client.get(f"/api/posts/{self.post.slug}/")
        self.assertNotIn("password", res.data["author"])

    def test_post_list_has_pagination(self):
        res = self.client.get("/api/posts/")
        self.assertIn("results", res.data)
        self.assertIn("count", res.data)
        self.assertIn("next", res.data)


# ──────────────────────────────────────────────────────────
# 13. Search
# ──────────────────────────────────────────────────────────
class SearchTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.author = make_user(username="searcher")
        make_post(self.author, title="Django REST Framework Guide")
        make_post(self.author, title="Next.js Tutorial")

    def test_search_by_title(self):
        res = self.client.get("/api/posts/?search=Django")
        titles = [p["title"] for p in res.data["results"]]
        self.assertIn("Django REST Framework Guide", titles)
        self.assertNotIn("Next.js Tutorial", titles)

    def test_search_no_match(self):
        res = self.client.get("/api/posts/?search=XYZ_NOTHING")
        self.assertEqual(res.data["count"], 0)


# ──────────────────────────────────────────────────────────
# 14. Post ordering
# ──────────────────────────────────────────────────────────
class OrderingTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.author = make_user(username="orderer")
        self.p1 = make_post(self.author, title="Oldest")
        self.p2 = make_post(self.author, title="Newest")

    def test_default_order_newest_first(self):
        res = self.client.get("/api/posts/")
        titles = [p["title"] for p in res.data["results"]]
        self.assertEqual(titles[0], "Newest")

    def test_order_by_created_ascending(self):
        res = self.client.get("/api/posts/?ordering=created")
        titles = [p["title"] for p in res.data["results"]]
        self.assertEqual(titles[0], "Oldest")
