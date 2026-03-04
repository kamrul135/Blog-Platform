// simple fetch-based API client with cookie support
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

// Read CSRF token from cookie
function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : "";
}

/** Try to refresh the access token using the refresh_token cookie. */
async function tryRefresh(): Promise<boolean> {
  try {
    const csrfToken = getCsrfToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (csrfToken) headers["X-CSRFToken"] = csrfToken;
    const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({}),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Clear stored session and redirect to login. */
function forceLogout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("user");
    window.location.href = "/login";
  }
}

async function request(path: string, options: RequestInit = {}, retry = true): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers["X-CSRFToken"] = csrfToken;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",  // send cookies with every request
  });

  // On 401, try refreshing the access token once then retry
  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request(path, options, false);
    }
    forceLogout();
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed ${res.status}: ${text}`);
  }
  // Return empty object for 204 No Content
  if (res.status === 204) return {};
  return res.json();
}

async function uploadFile(path: string, formData: FormData, retry = true): Promise<any> {
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {};
  if (csrfToken) headers["X-CSRFToken"] = csrfToken;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    credentials: "include",
    body: formData,
  });

  // On 401, try refreshing the access token once then retry
  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return uploadFile(path, formData, false);
    }
    forceLogout();
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed ${res.status}: ${text}`);
  }
  if (res.status === 204) return {};
  return res.json();
}

const api = {
  get: (path: string) => request(path, { method: "GET" }),
  post: (path: string, body?: any) => request(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: (path: string, body: any) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: (path: string, body: any) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: "DELETE" }),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return uploadFile("/auth/avatar/", formData);
  },
  follow: (username: string) => request(`/follow/${username}/`, { method: "POST" }),
  notifications: () => request("/notifications/", { method: "GET" }),
  markNotificationsRead: () => request("/notifications/read/", { method: "POST" }),
  updateProfile: (body: Record<string, string>) =>
    request("/auth/me/update/", { method: "PATCH", body: JSON.stringify(body) }),
};

export default api;
