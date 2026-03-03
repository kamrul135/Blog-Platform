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
}

export default function DashboardPage() {
  const auth = useContext(AuthContext);
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!auth?.loading && !auth?.user) {
      router.push("/login");
    }
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
    if (!confirm("Delete this post?")) return;
    setDeleteError("");
    try {
      await api.delete(`/posts/${slug}/`);
      setPosts((prev) => prev.filter((p) => p.slug !== slug));
    } catch {
      setDeleteError("Failed to delete post. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto mt-12 text-center text-gray-500">
        Loading your posts...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Posts</h1>
        <Link
          href="/posts/new"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          + New Post
        </Link>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {deleteError && <p className="text-red-500 mb-4">{deleteError}</p>}

      {posts.length === 0 && !error && (
        <p className="text-gray-500">No posts yet. Create your first one!</p>
      )}

      <ul className="space-y-3">
        {posts.map((post) => (
          <li
            key={post.id}
            className="flex items-center justify-between border p-4 rounded"
          >
            <div>
              <Link
                href={`/posts/${post.slug}`}
                className="font-medium hover:underline"
              >
                {post.title}
              </Link>
              <span
                className={`ml-2 text-xs px-2 py-0.5 rounded ${
                  post.status === "published"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {post.status}
              </span>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(post.created).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/posts/${post.slug}/edit`}
                className="text-blue-500 hover:underline text-sm"
              >
                Edit
              </Link>
              <button
                onClick={() => handleDelete(post.slug)}
                className="text-red-500 hover:underline text-sm"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
