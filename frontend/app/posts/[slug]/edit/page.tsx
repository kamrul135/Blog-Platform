"use client";

import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../../../../context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import api from "../../../../lib/api";
import dynamic from "next/dynamic";

const TipTapEditor = dynamic(() => import("../../../../components/TipTapEditor"), {
  ssr: false,
  loading: () => <div className="border rounded h-64 flex items-center justify-center text-gray-400">Loading editor...</div>,
});

export default function EditPostPage() {
  const auth = useContext(AuthContext);
  const router = useRouter();
  const { slug } = useParams() as { slug: string };
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("draft");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth?.loading && !auth?.user) {
      router.push("/login");
    }
  }, [auth, router]);

  useEffect(() => {
    if (!slug) return;
    api
      .get(`/posts/${slug}/`)
      .then((data: any) => {
        setTitle(data.title);
        setContent(data.content);
        setStatus(data.status);
      })
      .catch(() => setError("Failed to load post."))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.patch(`/posts/${slug}/`, { title, content, status });
      router.push("/dashboard");
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center mt-12">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Edit Post</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            className="border p-2 w-full rounded text-lg"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Content</label>
          <TipTapEditor
            content={content}
            onChange={setContent}
            placeholder="Write your post content here..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            className="border p-2 rounded"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border px-6 py-2 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
