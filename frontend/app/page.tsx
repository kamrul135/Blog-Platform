"use client";

import { useEffect, useState } from "react";
import api from "../lib/api";
import Link from "next/link";

interface Post {
  id: number;
  title: string;
  slug: string;
  author?: { username: string };
  created?: string;
  created_at?: string;
  reading_time?: number;
  view_count?: number;
  likes_count?: number;
}

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="skeleton" style={{ height: "4px" }} />
      <div className="p-5 space-y-3">
        <div className="skeleton" style={{ height: "18px", width: "75%" }} />
        <div className="skeleton" style={{ height: "14px", width: "50%" }} />
        <div className="skeleton" style={{ height: "14px", width: "100%" }} />
        <div className="skeleton" style={{ height: "12px", width: "30%", marginTop: "8px" }} />
      </div>
    </div>
  );
}

function avatarColor(name: string) {
  return `hsl(${(name.charCodeAt(0) * 37 + name.charCodeAt(name.length - 1) * 17) % 360}, 60%, 50%)`;
}

export default function Home() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [filtered, setFiltered] = useState<Post[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = async (pageNum: number, append = false) => {
    try {
      const res: any = await api.get(`/posts/?page=${pageNum}`);
      const data = res.results ?? res;
      const list: Post[] = Array.isArray(data) ? data : [];
      setHasMore(!!res.next);
      if (append) {
        setPosts((prev) => { const next = [...(prev ?? []), ...list]; setFiltered(next); return next; });
      } else {
        setPosts(list);
        setFiltered(list);
      }
    } catch {
      setError("Failed to load posts.");
      if (!append) { setPosts([]); setFiltered([]); }
    }
  };

  useEffect(() => { fetchPage(1); }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const next = page + 1;
    await fetchPage(next, true);
    setPage(next);
    setLoadingMore(false);
  };

  useEffect(() => {
    if (!posts) return;
    if (!search.trim()) { setFiltered(posts); return; }
    const q = search.toLowerCase();
    setFiltered(posts.filter((p) => p.title.toLowerCase().includes(q)));
  }, [search, posts]);

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="py-20 px-4 text-center"
        style={{
          background:
            "linear-gradient(160deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.06) 50%, rgba(167,139,250,0.04) 100%)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="animate-fade-in" style={{ maxWidth: "640px", margin: "0 auto" }}>
          <span
            className="inline-block text-xs font-semibold tracking-widest uppercase mb-5 px-3 py-1 rounded-full"
            style={{ background: "rgba(99,102,241,0.1)", color: "var(--primary)" }}
          >
            Welcome to Inkwell
          </span>
          <h1
            className="text-5xl sm:text-6xl font-extrabold mb-5"
            style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Ideas worth{" "}
            <span className="gradient-text">reading</span>
          </h1>
          <p className="text-lg mb-8" style={{ color: "var(--muted)", lineHeight: 1.7 }}>
            Discover stories, thinking, and expertise from writers on any topic.
          </p>

          {/* Search bar */}
          <div className="relative" style={{ maxWidth: "420px", margin: "0 auto" }}>
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: "var(--muted)", width: "15px", height: "15px" }}
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              style={{
                width: "100%", paddingLeft: "2.75rem", paddingRight: "1rem",
                paddingTop: "0.75rem", paddingBottom: "0.75rem",
                borderRadius: "0.875rem", fontSize: "0.925rem",
                background: "var(--surface)", border: "1.5px solid var(--border)",
                color: "var(--foreground)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
              }}
              placeholder="Search posts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ── Posts Grid ───────────────────────────────────────── */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "3rem 1rem" }}>
        {error && (
          <p className="text-center mb-6" style={{ color: "var(--danger)" }}>{error}</p>
        )}

        {posts === null ? (
          <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))" }}>
            {[1,2,3,4,5,6].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered?.length === 0 ? (
          <div className="text-center" style={{ padding: "5rem 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
            <p style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              {search ? "No posts match your search" : "No posts yet"}
            </p>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
              {search ? "Try a different keyword." : "Be the first to write something great!"}
            </p>
          </div>
        ) : (
          <>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              {search
                ? `${filtered?.length} result${filtered?.length !== 1 ? "s" : ""} for "${search}"`
                : `${posts.length} post${posts.length !== 1 ? "s" : ""} published`}
            </p>
            <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))" }}>
              {filtered?.map((post, i) => {
                const hue = (post.id * 53 + 200) % 360;
                const date = post.created ?? post.created_at;
                return (
                  <article
                    key={post.id}
                    className="animate-fade-in card-hover"
                    style={{
                      borderRadius: "1rem",
                      border: "1.5px solid var(--border)",
                      background: "var(--surface)",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      animationDelay: `${i * 55}ms`,
                    }}
                  >
                    {/* Color accent bar */}
                    <div
                      style={{
                        height: "4px",
                        background: `linear-gradient(90deg, hsl(${hue},70%,58%), hsl(${(hue+50)%360},65%,62%))`,
                      }}
                    />
                    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", flex: 1 }}>
                      <Link
                        href={`/posts/${post.slug}`}
                        className="line-clamp-2"
                        style={{
                          fontSize: "1rem",
                          fontWeight: 700,
                          color: "var(--foreground)",
                          textDecoration: "none",
                          lineHeight: 1.45,
                          marginBottom: "0.75rem",
                          transition: "color 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                      >
                        {post.title}
                      </Link>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginTop: "auto",
                          paddingTop: "0.75rem",
                          borderTop: "1px solid var(--border)",
                        }}
                      >
                        {post.author?.username ? (
                          <Link
                            href={`/users/${post.author.username}`}
                            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}
                          >
                            <div
                              style={{
                                width: "24px", height: "24px", borderRadius: "50%",
                                background: avatarColor(post.author.username),
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "10px", fontWeight: 700, color: "white", flexShrink: 0,
                              }}
                            >
                              {post.author.username[0].toUpperCase()}
                            </div>
                            <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 500 }}>
                              {post.author.username}
                            </span>
                          </Link>
                        ) : <span />}

                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.75rem", color: "var(--muted)" }}>
                          {post.reading_time && (
                            <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                              {post.reading_time}m
                            </span>
                          )}
                          {post.likes_count !== undefined && (
                            <span>❤ {post.likes_count}</span>
                          )}
                        </div>
                      </div>

                      {date && (
                        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.5rem" }}>
                          {new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Load more */}
            {!search && hasMore && (
              <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="btn-ghost"
                  style={{ padding: "0.75rem 2rem", fontSize: "0.9rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  {loadingMore ? (
                    <>
                      <svg style={{ animation: "spin 0.8s linear infinite" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                      Loading…
                    </>
                  ) : "Load more posts"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
