"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/users/", { username, email, password });
      router.push("/login");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block">Username</label>
          <input
            className="border p-2 w-full"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label className="block">Email</label>
          <input
            type="email"
            className="border p-2 w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block">Password</label>
          <input
            type="password"
            className="border p-2 w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="bg-green-500 text-white px-4 py-2 rounded">
          Register
        </button>
      </form>
    </div>
  );
}
