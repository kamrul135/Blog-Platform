"use client";

import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const auth = useContext(AuthContext);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (auth) {
      await auth.login(username, password);
      router.push("/");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
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
          <label className="block">Password</label>
          <input
            type="password"
            className="border p-2 w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="bg-blue-500 text-white px-4 py-2 rounded">Login</button>
      </form>
    </div>
  );
}
