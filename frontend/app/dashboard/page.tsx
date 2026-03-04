"use client";

import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import Link from "next/link";

interface Post {
  id: number;
  title: string;
  slug: string;
  status: string;
  created: string;
  view_count?: number;
  likes_count?: number;
  reading_time?: number;
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface)", border: "1.5px solid var(--border)",
        borderRadius: "1rem", padding: "1.25rem 1.5rem",
        display: "flex", flexDirection: "column", gap: "0.5rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 500 }}>{label}</p>
        <span style={{ color: "var(--primary)" }}>{icon}</span>
      </div>
      <p style={{ fontSize: "1.75rem", fontWeight: 800, lineHeight: 1 }}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const auth = useContext(AuthContext);
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!auth?.loading && !auth?.user) router.push("/login");
  }, [auth, router]);

  useEffect(() => {
    if (auth?.user) {
      api
        .get("/posts/?mine=true")
        .then((res: any) => {
          const data = res.results ?? res;
          setPosts(Array.isArray(data) ? data : []);
        })
        .catch(() => setError("Failed to load your posts."))
        .finally(() => setLoading(false));
    }
  }, [auth?.user]);

  const handleDelete = async (slug: string) => {
    if (!confirm("Delete this post? This action cannot be undone.")) return;
    setDeleteError("");
    setDeletingSlug(slug);
    try {
      await api.delete(`/posts/${slug}/`);
      setPosts((prev) => prev.filter((p) => p.slug !== slug));
    } catch {
      setDeleteError("Failed to delete post. Please try again.");
    } finally {
      setDeletingSlug(null);
    }
  };

  const published = posts.filter((p) => p.status === "published");
  const drafts = posts.filter((p) => p.status !== "published");
  const totalViews = posts.reduce((s, p) => s + (p.view_count ?? 0), 0);
  const totalLikes = posts.reduce((s, p) => s + (p.likes_count ?? 0), 0);

  if (loading) {
    return (
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "3rem 1.5rem" }}>
        <div className="skeleton" style={{ height: "2rem", width: "40%", marginBottom: "2rem" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: "90px", borderRadius: "1rem" }} />)}
        </div>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: "60px", borderRadius: "0.75rem", marginBottom: "0.75rem" }} />)}
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: "960px", margin: "0 auto", padding: "3rem 1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" }}>My Dashboard</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Welcome back, <strong>{auth?.user?.username}</strong></p>
        </div>
        <Link href="/posts/new" className="btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Post
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
        <StatCard
          label="Total Posts"
          value={posts.length}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
        />
        <StatCard
          label="Published"
          value={published.length}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>}
        />
        <StatCard
          label="Total Views"
          value={totalViews}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
        />
        <StatCard
          label="Total Likes"
          value={totalLikes}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>}
        />
      </div>

      {(error || deleteError) && (
        <div style={{ color: "var(--danger)", fontSize: "0.875rem", marginBottom: "1rem", padding: "0.75rem 1rem", background: "rgba(239,68,68,0.06)", borderRadius: "0.625rem", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error || deleteError}
        </div>
      )}

      {/* Posts table */}
      {posts.length === 0 && !error ? (
        <div style={{ textAlign: "center", padding: "5rem 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✍️</div>
          <p style={{ fontWeight: 600, fontSize: "1.1rem", marginBottom: "0.5rem" }}>No posts yet</p>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>Start writing your first story!</p>
          <Link href="/posts/new" className="btn-primary" style={{ display: "inline-flex" }}>
            Write something
          </Link>
        </div>
      ) : (
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "1rem", overflow: "hidden" }}>
          {/* Table header */}
          <div
            style={{
              display: "grid", gridTemplateColumns: "1fr auto auto auto auto",
              padding: "0.75rem 1.25rem",
              background: "var(--surface-hover)", borderBottom: "1px solid var(--border)",
              fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)",
              gap: "1rem",
            }}
          >
            <span>TITLE</span>
            <span style={{ textAlign: "center" }}>STATUS</span>
            <span style={{ textAlign: "right" }}>VIEWS</span>
            <span style={{ textAlign: "right" }}>DATE</span>
            <span style={{ textAlign: "right" }}>ACTIONS</span>
          </div>

          {posts.map((post, i) => (
            <div
              key={post.id}
              style={{
                display: "grid", gridTemplateColumns: "1fr auto auto auto auto",
                alignItems: "center", padding: "1rem 1.25rem",
                borderBottom: i < posts.length - 1 ? "1px solid var(--border)" : "none",
                gap: "1rem", transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div>
                <Link
                  href={`/posts/${post.slug}`}
                  style={{ fontWeight: 600, fontSize: "0.925rem", color: "var(--foreground)", textDecoration: "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                >
                  {post.title}
                </Link>
                {post.reading_time && (
                  <p style={{ fontSize: "0.72rem", color: "var(--muted)", margin: "0.1rem 0 0" }}>{post.reading_time} min read</p>
                )}
              </div>

              <span
                style={{
                  fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "9999px",
                  background: post.status === "published" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                  color: post.status === "published" ? "#10b981" : "#f59e0b",
                  textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap",
                }}
              >
                {post.status}
              </span>

              <span style={{ fontSize: "0.85rem", color: "var(--muted)", textAlign: "right" }}>
                {post.view_count ?? 0}
              </span>

              <span style={{ fontSize: "0.8rem", color: "var(--muted)", textAlign: "right", whiteSpace: "nowrap" }}>
                {new Date(post.created).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>

              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <Link
                  href={`/posts/${post.slug}/edit`}
                  style={{
                    fontSize: "0.8rem", padding: "0.3rem 0.75rem", borderRadius: "0.5rem",
                    border: "1px solid var(--border)", color: "var(--foreground)",
                    textDecoration: "none", transition: "all 0.15s", fontWeight: 500,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground)"; }}
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(post.slug)}
                  disabled={deletingSlug === post.slug}
                  style={{
                    fontSize: "0.8rem", padding: "0.3rem 0.75rem", borderRadius: "0.5rem",
                    border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444",
                    background: "transparent", cursor: "pointer", fontWeight: 500,
                    transition: "all 0.15s", opacity: deletingSlug === post.slug ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {deletingSlug === post.slug ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

