// simple fetch-based API client with cookie support
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

// Read CSRF token from cookie
function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : "";
}

async function request(path: string, options: RequestInit = {}) {
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed ${res.status}: ${text}`);
  }
  // Return empty object for 204 No Content
  if (res.status === 204) return {};
  return res.json();
}

const api = {
  get: (path: string) => request(path, { method: "GET" }),
  post: (path: string, body?: any) => request(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: (path: string, body: any) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: (path: string, body: any) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: "DELETE" }),
};

export default api;
