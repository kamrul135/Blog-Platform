"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useContext } from "react";
import api from "../../../lib/api";
import { AuthContext } from "../../../context/AuthContext";

interface Author {
  id: number;
  username: string;
}

interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  author: Author;
  created?: string;
  created_at?: string;
  view_count?: number;
  likes_count?: number;
  is_liked?: boolean;
  reading_time?: number;
}

interface Comment {
  id: number;
  author: Author;
  body: string;
  created_at?: string;
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
    // optimistic update
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((c) => c + (newLiked ? 1 : -1));
    try {
      const res: any = await api.post(`/posts/${post.slug}/like/`);
      setLiked(res.liked);
      setLikesCount(res.likes_count);
    } catch {
      // revert on error
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

  if (!post) return <div className="text-center mt-12">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold my-4">{post.title}</h1>
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-6">
        <a href={`/users/${post.author?.username}`} className="font-medium text-gray-700 hover:underline">
          {post.author?.username ?? "Unknown"}
        </a>
        {(post.created ?? post.created_at) && (
          <span>&middot; {new Date((post.created ?? post.created_at)!).toLocaleDateString()}</span>
        )}
        {post.reading_time && <span>&middot; {post.reading_time} min read</span>}
        {post.view_count !== undefined && <span>&middot; {post.view_count} views</span>}

        {/* Like button */}
        <button
          onClick={handleLike}
          disabled={liking || !auth?.user}
          className={`ml-auto flex items-center gap-1 px-3 py-1 rounded-full border transition ${
            liked
              ? "bg-red-50 border-red-300 text-red-500"
              : "border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-400"
          } disabled:opacity-50`}
          title={auth?.user ? (liked ? "Unlike" : "Like") : "Login to like"}
        >
          {liked ? "❤️" : "🤍"} {likesCount}
        </button>
      </div>
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Comments */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">
          Comments ({comments.length})
        </h2>

        {comments.map((c) => (
          <div key={c.id} className="border rounded p-4 mb-3">
            <p className="text-sm font-medium text-gray-700 mb-1">
              {c.author?.username ?? "Anonymous"}
              {c.created_at && (
                <span className="font-normal text-gray-400 ml-2">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              )}
            </p>
            <p>{c.body}</p>
          </div>
        ))}

        {auth?.user ? (
          <form onSubmit={handleComment} className="mt-6 space-y-3">
            <h3 className="font-semibold">Leave a comment</h3>
            {commentError && <p className="text-red-500 text-sm">{commentError}</p>}
            <textarea
              className="border p-2 w-full rounded h-28"
              placeholder="Write your comment..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-500 text-white px-5 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Post Comment"}
            </button>
          </form>
        ) : (
          <p className="mt-6 text-sm text-gray-500">
            <a href="/login" className="text-blue-500 hover:underline">
              Log in
            </a>{" "}
            to leave a comment.
          </p>
        )}
      </section>
    </div>
  );
}
