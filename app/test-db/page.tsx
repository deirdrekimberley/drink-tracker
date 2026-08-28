"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestDatabasePage() {
  const [message, setMessage] = useState("");

  async function testConnection() {
    const { data, error } = await supabase
      .from("drink_logs")
      .select("*")
      .limit(1);

    if (error) {
      setMessage(`Connected, but database said: ${error.message}`);
      console.error(error);
      return;
    }

    console.log(data);
    setMessage("Supabase connection works!");
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">Supabase Test</h1>

        <button
          onClick={testConnection}
          className="mt-6 rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white"
        >
          Test connection
        </button>

        {message && (
          <p className="mt-6 rounded-xl bg-white p-4">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}