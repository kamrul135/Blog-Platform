# ✦ Inkwell — Full-Stack Blog Platform

A modern, feature-rich blogging platform built with **Django + Django Channels** on the backend and **Next.js 16 + TypeScript** on the frontend.

---

## ✨ Features

| Category | Details |
|---|---|
| **Auth** | JWT via HttpOnly cookies, auto-refresh on 401, register / login / logout |
| **Posts** | Rich-text editor (TipTap), slug routing, view counter, reading-time estimate, like/unlike |
| **Comments** | Nested per-post comments, author-only edit/delete |
| **Profiles** | Avatar upload, bio, website, Twitter, GitHub links, follow / unfollow |
| **Notifications** | **Real-time WebSocket** push (Django Channels + Daphne); like, comment, follow events |
| **Dark mode** | Manual light / dark / system toggle, persisted in `localStorage` |
| **Search** | Client-side post filtering on the home page |
| **Pagination** | "Load more" posts with server-side cursor |
| **Settings** | Account settings page (bio, social links, email, password change) |
| **Dashboard** | Author-only view of own posts with stats |

---

## 🏗️ Tech Stack

### Backend
- Python 3.12 · Django 6 · Django REST Framework
- **Django Channels 4 + Daphne** – ASGI WebSocket server
- `rest_framework_simplejwt` – JWT authentication
- `django-cors-headers` – CORS for the Next.js dev server
- SQLite (dev) / PostgreSQL via `DATABASE_URL` (prod)
- Pillow – image handling for avatars

### Frontend
- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4
- TipTap rich-text editor
- `WebSocket` API with exponential reconnect for real-time notifications

---

## 📁 Project Structure

```
blog-platform/
├── backend/
│   ├── blog/
│   │   ├── models.py          # User, Post, Comment, Follow, Notification
│   │   ├── views.py           # All API views + WSTokenView
│   │   ├── serializers.py
│   │   ├── consumers.py       # WebSocket consumer
│   │   ├── routing.py         # WS URL routing
│   │   ├── ws_middleware.py   # JWT auth for WebSocket connections
│   │   ├── authentication.py  # Cookie-based JWT authentication
│   │   └── migrations/
│   ├── core/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── asgi.py            # ProtocolTypeRouter (HTTP + WS)
│   ├── requirements.txt
│   └── manage.py
└── frontend/
    ├── app/                   # Next.js App Router pages
    │   ├── page.tsx               # Home (posts list + search + load more)
    │   ├── dashboard/page.tsx     # Author dashboard
    │   ├── login/ register/
    │   ├── posts/[slug]/          # Post detail + edit
    │   ├── users/[username]/      # Public profile + follow button
    │   └── settings/page.tsx      # Account settings
    ├── components/
    │   ├── Navbar.tsx             # Dark-mode toggle + real-time bell
    │   └── TipTapEditor.tsx
    ├── context/
    │   ├── AuthContext.tsx
    │   ├── ThemeContext.tsx        # light / dark / system
    │   └── NotificationsContext.tsx  # WebSocket connection + state
    └── lib/api.ts                 # Fetch client with 401 auto-refresh
```

---

## 🚀 Getting Started

### Prerequisites
- Python ≥ 3.11
- Node.js ≥ 18
- (Optional) PostgreSQL for production

---

### Backend Setup

```bash
cd blog-platform/backend

# 1. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create .env file
cp .env.example .env          # edit values (see below)

# 4. Run migrations
python manage.py migrate

# 5. Create a superuser (optional)
python manage.py createsuperuser

# 6. Start the server (Daphne ASGI – required for WebSockets)
python manage.py runserver
# Server starts at http://127.0.0.1:8000
```

#### Backend `.env` variables

```ini
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3   # or postgres://user:pass@host/db
```

---

### Frontend Setup

```bash
cd blog-platform/frontend

# 1. Install dependencies
npm install

# 2. Create .env.local
echo "NEXT_PUBLIC_API_BASE=http://localhost:8000/api" > .env.local

# 3. Start the dev server
npm run dev
# App runs at http://localhost:3000
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/token/` | Login (sets HttpOnly JWT cookies) |
| `POST` | `/api/auth/token/refresh/` | Refresh access token |
| `POST` | `/api/auth/logout/` | Clear auth cookies |
| `GET` | `/api/auth/me/` | Current user info |
| `PATCH` | `/api/auth/me/update/` | Update profile (bio, social, password) |
| `POST` | `/api/auth/avatar/` | Upload profile picture |
| `GET` | `/api/auth/ws-token/` | Get JWT for WebSocket handshake |
| `GET/POST` | `/api/posts/` | List / create posts |
| `GET/PATCH/DELETE` | `/api/posts/{slug}/` | Post detail / edit / delete |
| `POST` | `/api/posts/{slug}/like/` | Toggle like |
| `GET/POST` | `/api/comments/` | List / create comments |
| `GET` | `/api/profile/{username}/` | Public profile + posts |
| `POST` | `/api/follow/{username}/` | Toggle follow / unfollow |
| `GET` | `/api/notifications/` | List notifications + unread count |
| `POST` | `/api/notifications/read/` | Mark all notifications read |
| `GET` | `/api/categories/` | Post categories |
| `GET` | `/api/tags/` | Post tags |

### WebSocket

```
ws://localhost:8000/ws/notifications/?token=<access_token>
```

Messages are JSON objects pushed server → client whenever a like, comment, or follow event occurs.

---

## 🔧 Real-time Architecture

```
Browser ──── WS ────> ws/notifications/?token=…
                            │
                    JWTAuthMiddleware
                            │
                   NotificationConsumer
                            │
                   InMemoryChannelLayer
                     ┌──────┴──────┐
              FollowView       PostViewSet.like()
                             CommentViewSet
```

> **Production note:** Replace `InMemoryChannelLayer` with `channels_redis.core.RedisChannelLayer` when running multiple server workers.

---

## 🌐 Deployment Notes

1. Set `DEBUG=False` and configure `ALLOWED_HOSTS` / `CORS_ALLOWED_ORIGINS` for your domain.
2. Run `python manage.py collectstatic` and serve static files via a CDN or nginx.
3. Replace `InMemoryChannelLayer` with Redis channel layer.
4. Use `daphne core.asgi:application` behind nginx.
5. Set `secure=True` on cookie `.set_cookie()` calls when serving over HTTPS.

---

## 📄 License

MIT
