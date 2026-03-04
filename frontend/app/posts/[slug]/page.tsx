"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useContext, useRef } from "react";
import api from "../../../lib/api";
import { AuthContext } from "../../../context/AuthContext";
import Link from "next/link";

interface Author { id: number; username: string; }
interface Post {
  id: number; title: string; slug: string; content: string;
  author: Author; created?: string; created_at?: string;
  view_count?: number; likes_count?: number; is_liked?: boolean; reading_time?: number;
}
interface Comment { id: number; author: Author; body: string; created_at?: string; }

function avatarColor(name: string) {
  return `hsl(${(name.charCodeAt(0) * 37 + name.charCodeAt(name.length - 1) * 17) % 360}, 60%, 50%)`;
}

export default function PostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const auth = useContext(AuthContext);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [commentError, setCommentError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [progress, setProgress] = useState(0);
  const articleRef = useRef<HTMLDivElement>(null);

  // Reading progress bar
  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      setProgress(total > 0 ? Math.min(100, Math.max(0, (scrolled / total) * 100)) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!slug) return;
    api.get(`/posts/${slug}/`).then((data: any) => {
      setPost(data);
      setLiked(data.is_liked ?? false);
      setLikesCount(data.likes_count ?? 0);
    });
    api.get(`/comments/?post=${slug}`).then((data: any) => {
      setComments(Array.isArray(data) ? data : data.results ?? []);
    });
  }, [slug]);

  const handleLike = async () => {
    if (!auth?.user || !post || liking) return;
    setLiking(true);
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((c) => c + (newLiked ? 1 : -1));
    try {
      const res: any = await api.post(`/posts/${post.slug}/like/`);
      setLiked(res.liked);
      setLikesCount(res.likes_count);
    } catch {
      setLiked(!newLiked);
      setLikesCount((c) => c + (newLiked ? -1 : 1));
    } finally {
      setLiking(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;
    setCommentError("");
    setSubmitting(true);
    try {
      const created: any = await api.post("/comments/", { post: post.id, body });
      setComments((prev) => [...prev, created]);
      setBody("");
    } catch {
      setCommentError("Failed to submit comment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!post) {
    return (
      <div style={{ maxWidth: "740px", margin: "0 auto", padding: "4rem 1.5rem" }}>
        <div className="skeleton" style={{ height: "2.5rem", width: "70%", marginBottom: "1rem" }} />
        <div className="skeleton" style={{ height: "1rem", width: "40%", marginBottom: "2rem" }} />
        {[100, 90, 95, 80, 85].map((w, i) => (
          <div key={i} className="skeleton" style={{ height: "1rem", width: `${w}%`, marginBottom: "0.75rem" }} />
        ))}
      </div>
    );
  }

  const dateStr = (post.created ?? post.created_at)
    ? new Date((post.created ?? post.created_at)!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <>
      {/* Reading progress */}
      <div id="reading-progress" style={{ width: `${progress}%` }} />

      <div ref={articleRef} style={{ maxWidth: "740px", margin: "0 auto", padding: "3rem 1.5rem" }}>
        {/* Title */}
        <h1
          className="animate-fade-in"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 800, lineHeight: 1.2, marginBottom: "1.25rem", letterSpacing: "-0.025em" }}
        >
          {post.title}
        </h1>

        {/* Meta bar */}
        <div
          className="animate-fade-in"
          style={{
            display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem",
            paddingBottom: "1.5rem", borderBottom: "1px solid var(--border)",
            marginBottom: "2.5rem", animationDelay: "80ms",
          }}
        >
          {/* Author */}
          <Link href={`/users/${post.author?.username}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: avatarColor(post.author?.username ?? "a"),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "13px", color: "white",
              }}
            >
              {(post.author?.username ?? "?")[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
                {post.author?.username ?? "Unknown"}
              </p>
              {dateStr && <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: 0 }}>{dateStr}</p>}
            </div>
          </Link>

          {/* Stats */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginLeft: "auto", flexWrap: "wrap" }}>
            {post.reading_time && (
              <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {post.reading_time} min read
              </span>
            )}
            {post.view_count !== undefined && (
              <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                {post.view_count}
              </span>
            )}

            {/* Like button */}
            <button
              onClick={handleLike}
              disabled={liking || !auth?.user}
              title={auth?.user ? (liked ? "Unlike" : "Like") : "Login to like"}
              style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                padding: "0.4rem 0.875rem", borderRadius: "9999px",
                border: liked ? "1.5px solid rgba(239,68,68,0.4)" : "1.5px solid var(--border)",
                background: liked ? "rgba(239,68,68,0.06)" : "transparent",
                color: liked ? "#ef4444" : "var(--muted)",
                fontSize: "0.85rem", fontWeight: 600, cursor: auth?.user ? "pointer" : "not-allowed",
                transition: "all 0.2s", opacity: liking ? 0.6 : 1,
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {likesCount}
            </button>
          </div>
        </div>

        {/* Article content */}
        <div
          className="prose animate-fade-in"
          style={{ animationDelay: "120ms", maxWidth: "none" }}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Comments section */}
        <section
          style={{
            marginTop: "4rem", paddingTop: "2.5rem",
            borderTop: "1px solid var(--border)",
          }}
        >
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: "1.5rem" }}>
            {comments.length} Comment{comments.length !== 1 ? "s" : ""}
          </h2>

          {comments.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex", gap: "0.875rem",
                padding: "1rem 0", borderBottom: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  background: avatarColor(c.author?.username ?? "a"),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: "11px", color: "white", flexShrink: 0,
                }}
              >
                {(c.author?.username ?? "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{c.author?.username ?? "Anonymous"}</span>
                  {c.created_at && (
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: "0.9375rem", lineHeight: 1.65, color: "var(--foreground)" }}>{c.body}</p>
              </div>
            </div>
          ))}

          {/* Comment form */}
          {auth?.user ? (
            <form onSubmit={handleComment} style={{ marginTop: "2rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Leave a comment</h3>
              {commentError && (
                <p style={{ color: "var(--danger)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>{commentError}</p>
              )}
              <textarea
                style={{
                  width: "100%", padding: "0.875rem", borderRadius: "0.75rem",
                  border: "1.5px solid var(--border)", background: "var(--surface-hover)",
                  color: "var(--foreground)", fontSize: "0.925rem", lineHeight: 1.6,
                  resize: "vertical", minHeight: "110px",
                }}
                placeholder="Share your thoughts…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? "Posting…" : "Post comment"}
                </button>
              </div>
            </form>
          ) : (
            <div
              style={{
                marginTop: "2rem", padding: "1.25rem", borderRadius: "0.875rem",
                background: "var(--surface-hover)", border: "1px solid var(--border)",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: "0.9rem", color: "var(--muted)", margin: 0 }}>
                <Link href="/login" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
                {" "}to join the conversation.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
