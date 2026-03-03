"use client";

import Link from "next/link";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const auth = useContext(AuthContext);
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
      await auth.logout();
      router.push("/login");
    }
  };

  return (
    <nav className="flex gap-4 items-center">
      <Link href="/" className="font-bold text-lg">📝 Blog</Link>
      <div className="ml-auto flex gap-4 items-center">
        {auth?.user ? (
          <>
            <Link href="/dashboard" className="text-blue-600">Dashboard</Link>
            <span className="text-gray-600">Hi, {auth.user.username}</span>
            <button className="text-red-500 hover:underline" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:underline">Login</Link>
            <Link href="/register" className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
