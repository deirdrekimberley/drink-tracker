"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function signUp() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
  `${window.location.origin}/groups`,
        },
      });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Sign-up submitted. Check your email if confirmation is enabled."
      );
    }

    setLoading(false);
  }

  async function signIn() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Logged in successfully.");
      window.location.href = "/";
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-100 px-5 py-10 text-gray-900">
      <div className="mx-auto max-w-md">
        <header className="mb-8">
          <p className="text-sm font-medium text-gray-500">
            Drink Tracker
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Log in or sign up
          </h1>
        </header>

        <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-500"
            />
          </div>

          <button
            onClick={signIn}
            disabled={loading}
            className="w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            Log in
          </button>

          <button
            onClick={signUp}
            disabled={loading}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-700 disabled:opacity-50"
          >
            Create account
          </button>

          {message && (
            <p className="rounded-xl bg-gray-100 p-3 text-sm text-gray-700">
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}