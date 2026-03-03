"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "../../../lib/api";

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
  posts: Post[];
}

export default function ProfilePage() {
  const { username } = useParams() as { username: string };
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!username) return;
    api
      .get(`/users/${username}/`)
      .then((data: any) => setProfile(data))
      .catch(() => setError("User not found."));
  }, [username]);

  if (!profile && !error) {
    return <div className="text-center mt-12 text-gray-500">Loading...</div>;
  }

  if (error) {
    return <div className="text-center mt-12 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Profile header */}
      <div className="flex items-center gap-4 my-8 pb-6 border-b">
        <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-2xl text-white font-bold">
          {profile!.username[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{profile!.username}</h1>
          {profile!.date_joined && (
            <p className="text-sm text-gray-500">
              Member since {new Date(profile!.date_joined).toLocaleDateString()}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-0.5">
            {profile!.posts.length} published post{profile!.posts.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Posts */}
      <h2 className="text-xl font-semibold mb-4">Posts by {profile!.username}</h2>
      {profile!.posts.length === 0 ? (
        <p className="text-gray-500">No posts yet.</p>
      ) : (
        <ul className="space-y-4">
          {profile!.posts.map((post) => (
            <li key={post.id} className="border rounded p-4 hover:shadow transition">
              <Link
                href={`/posts/${post.slug}`}
                className="text-lg font-semibold hover:underline"
              >
                {post.title}
              </Link>
              <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-2">
                {post.created && (
                  <span>{new Date(post.created).toLocaleDateString()}</span>
                )}
                {post.reading_time && <span>{post.reading_time} min read</span>}
                {post.view_count !== undefined && <span>{post.view_count} views</span>}
                {post.likes_count !== undefined && <span>❤️ {post.likes_count}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
