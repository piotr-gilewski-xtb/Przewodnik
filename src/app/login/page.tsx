"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-5">
        <h1 className="text-2xl font-semibold text-center">Zaloguj się</h1>
        {sent ? (
          <p className="text-center text-zinc-600">
            Sprawdź skrzynkę <b>{email}</b> — wysłaliśmy link do logowania.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ty@example.com"
              className="w-full px-4 py-3 rounded-lg border border-zinc-300 bg-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-sky-500 text-white font-medium disabled:opacity-50"
            >
              {loading ? "Wysyłanie…" : "Wyślij magic link"}
            </button>
            {err && <p className="text-sm text-red-600">{err}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
