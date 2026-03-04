"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState, useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import api from "../../../lib/api";
import { AuthContext } from "../../../context/AuthContext";

interface Post {
  id: number;
  title: string;
  slug: string;
  created?: string;
  reading_time?: number;
  likes_count?: number;
  view_count?: number;
}

interface Profile {
  id: number;
  username: string;
  date_joined?: string;
  avatar?: string | null;
  bio?: string | null;
  website?: string | null;
  twitter?: string | null;
  github?: string | null;
  followers_count?: number;
  following_count?: number;
  is_following?: boolean;
  posts: Post[];
}

function avatarColor(name: string) {
  return `hsl(${(name.charCodeAt(0) * 37 + name.charCodeAt(name.length - 1) * 17) % 360}, 60%, 50%)`;
}

export default function ProfilePage() {
  const { username } = useParams() as { username: string };
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [followLoading, setFollowLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const auth = useContext(AuthContext);
  const isOwnProfile = auth?.user?.username === username;

  const loadProfile = () => {
    if (!username) return;
    api.get(`/profile/${username}/`)
      .then((data: any) => setProfile(data))
      .catch(() => setError("User not found."));
  };

  useEffect(() => {
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5 MB.");
      return;
    }
    setUploadError("");
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // Upload to backend
    setUploading(true);
    try {
      const res: any = await api.uploadAvatar(file);
      setAvatarPreview(res.avatar);
      setProfile((prev) => prev ? { ...prev, avatar: res.avatar } : prev);
      await auth?.refreshUser();
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed.");
      setAvatarPreview(null);
    } finally {
      setUploading(false);
    }
  };

  if (!profile && !error) {
    return (
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "3rem 1.5rem" }}>
        {/* Skeleton */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2.5rem" }}>
          <div className="skeleton" style={{ width: "80px", height: "80px", borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: "1.75rem", width: "40%", marginBottom: "0.5rem" }} />
            <div className="skeleton" style={{ height: "1rem", width: "60%" }} />
          </div>
        </div>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: "80px", borderRadius: "0.875rem", marginBottom: "1rem" }} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "6rem 1rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👤</div>
        <p style={{ fontWeight: 600, fontSize: "1.1rem", marginBottom: "0.5rem" }}>User not found</p>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>The profile you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  const totalViews = profile!.posts.reduce((s, p) => s + (p.view_count ?? 0), 0);
  const totalLikes = profile!.posts.reduce((s, p) => s + (p.likes_count ?? 0), 0);
  const displayAvatar = avatarPreview || profile!.avatar;

  const handleFollow = async () => {
    if (!auth?.user || followLoading) return;
    setFollowLoading(true);
    try {
      const res: any = await api.follow(profile!.username);
      setProfile((prev) =>
        prev ? {
          ...prev,
          is_following: res.following,
          followers_count: (prev.followers_count ?? 0) + (res.following ? 1 : -1),
        } : prev
      );
    } catch {
      // silent
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "800px", margin: "0 auto", padding: "3rem 1.5rem" }}>
      {/* Profile header */}
      <div
        style={{
          display: "flex", alignItems: "flex-start", gap: "1.5rem",
          paddingBottom: "2rem", borderBottom: "1px solid var(--border)",
          marginBottom: "2.5rem", flexWrap: "wrap",
        }}
      >
        {/* Avatar with upload overlay */}
        <div style={{ position: "relative", flexShrink: 0, width: "80px", height: "80px" }}>
          {displayAvatar ? (
            <Image
              src={displayAvatar}
              alt={profile!.username}
              width={80}
              height={80}
              style={{
                width: "80px", height: "80px", borderRadius: "50%",
                objectFit: "cover", display: "block",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                opacity: uploading ? 0.5 : 1,
                transition: "opacity 0.2s",
              }}
            />
          ) : (
            <div
              style={{
                width: "80px", height: "80px", borderRadius: "50%",
                background: `linear-gradient(135deg, ${avatarColor(profile!.username)}, ${avatarColor(profile!.username + "x")})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "2rem", fontWeight: 800, color: "white",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                opacity: uploading ? 0.5 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {profile!.username[0].toUpperCase()}
            </div>
          )}

          {/* Upload spinner overlay */}
          {uploading && (
            <div
              style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.35)",
              }}
            >
              <svg style={{ animation: "spin 0.8s linear infinite" }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            </div>
          )}

          {/* Camera button – only for own profile */}
          {isOwnProfile && !uploading && (
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Change profile picture"
              style={{
                position: "absolute", bottom: 0, right: 0,
                width: "26px", height: "26px", borderRadius: "50%",
                background: "var(--primary)", border: "2px solid var(--background)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "white", padding: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
              {profile!.username}
            </h1>
            {!isOwnProfile && auth?.user && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                style={{
                  padding: "0.35rem 1rem", borderRadius: "999px", fontSize: "0.82rem", fontWeight: 600,
                  cursor: followLoading ? "wait" : "pointer",
                  border: profile!.is_following ? "1.5px solid var(--border)" : "none",
                  background: profile!.is_following ? "transparent" : "var(--primary)",
                  color: profile!.is_following ? "var(--foreground)" : "white",
                  transition: "all 0.15s",
                }}
              >
                {followLoading ? "…" : profile!.is_following ? "Unfollow" : "Follow"}
              </button>
            )}
          </div>

          {profile!.date_joined && (
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.25rem", marginBottom: "0.75rem" }}>
              Member since {new Date(profile!.date_joined).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
            </p>
          )}

          {/* Bio */}
          {profile!.bio && (
            <p style={{ fontSize: "0.9rem", color: "var(--foreground)", marginBottom: "0.75rem", lineHeight: 1.6, maxWidth: "480px" }}>
              {profile!.bio}
            </p>
          )}

          {/* Social links */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {profile!.website && (
              <a href={profile!.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", color: "var(--primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                Website
              </a>
            )}
            {profile!.twitter && (
              <a href={`https://twitter.com/${profile!.twitter.replace("@","")}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", color: "var(--primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                {profile!.twitter}
              </a>
            )}
            {profile!.github && (
              <a href={`https://github.com/${profile!.github}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", color: "var(--primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
                {profile!.github}
              </a>
            )}
          </div>

          {/* Upload error */}
          {uploadError && (
            <p style={{ fontSize: "0.82rem", color: "#ef4444", marginBottom: "0.75rem" }}>{uploadError}</p>
          )}

          {/* Upload hint */}
          {isOwnProfile && !uploadError && (
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
              Click the camera icon to update your profile picture •{" "}
              <a href="/settings" style={{ color: "var(--primary)", textDecoration: "none" }}>Edit profile</a>
            </p>
          )}

          {/* Mini stats */}
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            {[
              { label: "Posts", value: profile!.posts.length },
              { label: "Followers", value: profile!.followers_count ?? 0 },
              { label: "Following", value: profile!.following_count ?? 0 },
              { label: "Views", value: totalViews },
              { label: "Likes", value: totalLikes },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{value}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Posts */}
      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem", color: "var(--muted)" }}>
        POSTS BY {profile!.username.toUpperCase()}
      </h2>

      {profile!.posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 0" }}>
          <p style={{ color: "var(--muted)" }}>No posts published yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {profile!.posts.map((post, i) => {
            const hue = (post.id * 53 + 200) % 360;
            return (
              <article
                key={post.id}
                className="animate-fade-in card-hover"
                style={{
                  background: "var(--surface)", border: "1.5px solid var(--border)",
                  borderRadius: "0.875rem", overflow: "hidden",
                  display: "flex", alignItems: "center",
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <div style={{ width: "4px", alignSelf: "stretch", background: `linear-gradient(180deg, hsl(${hue},70%,58%), hsl(${(hue+50)%360},65%,62%))` }} />
                <div style={{ flex: 1, padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <Link
                      href={`/posts/${post.slug}`}
                      style={{ fontWeight: 600, fontSize: "0.975rem", color: "var(--foreground)", textDecoration: "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                    >
                      {post.title}
                    </Link>
                    {post.created && (
                      <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: "0.15rem 0 0" }}>
                        {new Date(post.created).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.78rem", color: "var(--muted)", flexShrink: 0 }}>
                    {post.reading_time && <span>{post.reading_time}m read</span>}
                    {post.view_count !== undefined && <span>👁 {post.view_count}</span>}
                    {post.likes_count !== undefined && <span>❤ {post.likes_count}</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
