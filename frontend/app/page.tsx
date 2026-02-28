"use client";

import { useEffect, useState } from "react";
import api from "../lib/api";
import Link from "next/link";

interface Post {
  id: number;
  title: string;
  slug: string;
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    api
      .get("/posts/")
      .then((res) => {
        setPosts(res.data);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold my-4">Latest Posts</h1>
      {posts.length === 0 && <p>No posts found.</p>}
      <ul className="space-y-2">
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={`/posts/${post.slug}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
