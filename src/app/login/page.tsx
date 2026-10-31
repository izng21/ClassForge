"use client";

import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Login failed.");
      return;
    }
    // A full navigation makes the next request after the Set-Cookie response,
    // so the protected dashboard always receives the new session.
    window.location.replace("/dashboard");
  }

  return (
    <div className="mx-auto mt-10 max-w-md sm:mt-16">
      <div className="mb-8 text-center"><span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brass font-bold text-white">CE</span><h1 className="text-3xl font-semibold">Welcome back</h1><p className="mt-2 text-sm text-ink-soft">Sign in to manage your class communications.</p></div>
      <form onSubmit={handleSubmit} className="space-y-5 panel p-7">
        <Field label="Email">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <p className="rounded-lg bg-rust-soft px-3 py-2 text-sm text-rust">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
