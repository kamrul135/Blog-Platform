// simple fetch-based API client
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function request(path: string, options: RequestInit = {}) {
  const headers: any = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed ${res.status}: ${text}`);
  }
  return res.json();
}

const api = {
  get: (path: string) => request(path, { method: "GET" }),
  post: (path: string, body: any) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path: string, body: any) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: "DELETE" }),
};

export default api;
