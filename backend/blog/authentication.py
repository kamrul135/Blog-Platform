from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """Read JWT access token from HttpOnly cookie instead of Authorization header."""

    def get_raw_token(self, header):
        # ignore incoming header; pull from cookies
        return self.request.COOKIES.get("access_token")
