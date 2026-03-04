"""
ASGI config for core project – with Django Channels WebSocket support.
"""

import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from blog.ws_middleware import JWTAuthMiddleware            # noqa: E402
import blog.routing                                          # noqa: E402

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
        URLRouter(blog.routing.websocket_urlpatterns)
    ),
})
