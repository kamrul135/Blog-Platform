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

export default function Home() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [filtered, setFiltered] = useState<Post[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/posts/")
      .then((res: any) => {
        const data = res.results ?? res;
        const list = Array.isArray(data) ? data : [];
        setPosts(list);
        setFiltered(list);
      })
      .catch(() => {
        setError("Failed to load posts.");
        setPosts([]);
        setFiltered([]);
      });
  }, []);

  useEffect(() => {
    if (!posts) return;
    if (!search.trim()) {
      setFiltered(posts);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(posts.filter((p) => p.title.toLowerCase().includes(q)));
  }, [search, posts]);

  if (posts === null) {
    return (
      <div className="max-w-3xl mx-auto mt-12 text-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between my-6">
        <h1 className="text-3xl font-bold">Latest Posts</h1>
        <input
          className="border rounded px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-300"
          placeholder="Search posts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {filtered?.length === 0 && !error && (
        <p className="text-gray-500">{search ? "No posts match your search." : "No posts published yet."}</p>
      )}
      <ul className="space-y-4">
        {filtered?.map((post) => (
          <li key={post.id} className="border rounded p-4 hover:shadow transition">
            <Link href={`/posts/${post.slug}`} className="text-xl font-semibold hover:underline">
              {post.title}
            </Link>
            <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-2">
              {post.author?.username && (
                <a href={`/users/${post.author.username}`} className="hover:underline text-gray-500">
                  {post.author.username}
                </a>
              )}
              {(post.created ?? post.created_at) && (
                <span>{new Date((post.created ?? post.created_at)!).toLocaleDateString()}</span>
              )}
              {post.reading_time && <span>{post.reading_time} min read</span>}
              {post.view_count !== undefined && <span>{post.view_count} views</span>}
              {post.likes_count !== undefined && <span>❤️ {post.likes_count}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
