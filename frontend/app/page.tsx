"use client";

import { useEffect, useState } from "react";
import api from "../lib/api";
import Link from "next/link";

interface Post {
  id: number;
  title: string;
  slug: string;
  author?: { username: string };
  created_at?: string;
}

export default function Home() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/posts/")
      .then((res: any) => {
        // DRF paginated response: { results: [...] } or plain array
        const data = res.results ?? res;
        setPosts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setError("Failed to load posts.");
        setPosts([]);
      });
  }, []);

  if (posts === null) {
    return (
      <div className="max-w-3xl mx-auto mt-12 text-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold my-6">Latest Posts</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {posts.length === 0 && !error && (
        <p className="text-gray-500">No posts published yet.</p>
      )}
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.id} className="border rounded p-4 hover:shadow transition">
            <Link
              href={`/posts/${post.slug}`}
              className="text-xl font-semibold hover:underline"
            >
              {post.title}
            </Link>
            {(post.author || post.created_at) && (
              <p className="text-sm text-gray-400 mt-1">
                {post.author?.username && <>By {post.author.username}</>}
                {post.created_at && (
                  <> &middot; {new Date(post.created_at).toLocaleDateString()}</>
                )}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
