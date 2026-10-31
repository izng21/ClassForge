"use client";

import { useEffect, useState } from "react";
import { Breadcrumbs, Button, Field, Input, Select } from "@/components/ui";

type Settings = {
  host: string;
  port: number;
  encryption: "tls" | "ssl" | "none";
  username: string;
  sender_name: string;
} | null;

export default function SmtpSettingsPage() {
  const [existing, setExisting] = useState<Settings>(null);
  const [loading, setLoading] = useState(true);

  const [host, setHost] = useState("smtp.gmail.com");
  const [port, setPort] = useState(587);
  const [encryption, setEncryption] = useState<"tls" | "ssl" | "none">("tls");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [senderName, setSenderName] = useState("");

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings/smtp");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (data.settings) {
        setExisting(data.settings);
        setHost(data.settings.host);
        setPort(data.settings.port);
        setEncryption(data.settings.encryption);
        setUsername(data.settings.username);
        setSenderName(data.settings.sender_name);
      }
      setLoading(false);
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings/smtp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, port, encryption, username, password, senderName }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage({ type: "error", text: data.error });
      return;
    }
    setMessage({ type: "ok", text: "SMTP settings saved." });
    setPassword("");
  }

  async function handleTest() {
    setTesting(true);
    setMessage(null);
    const res = await fetch("/api/settings/smtp/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setTesting(false);
    setMessage({ type: res.ok ? "ok" : "error", text: res.ok ? data.message : data.error });
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <Breadcrumbs items={[{ label: "Settings" }, { label: "SMTP" }]} />
      <h1 className="text-3xl font-semibold mb-1">SMTP settings</h1>
      <p className="text-sm text-ink-soft mb-6">
        Configure your Gmail or other SMTP to send emails to students. For Gmail, use an App
        Password (not your regular password).{" "}
        <a
          href="https://support.google.com/accounts/answer/185833"
          target="_blank"
          rel="noreferrer"
          className="underline text-brass-deep"
        >
          Get Gmail App Password ↗
        </a>
      </p>

      <form onSubmit={handleSave} className="panel p-6 sm:p-7 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="SMTP Host">
            <Input value={host} onChange={(e) => setHost(e.target.value)} required />
          </Field>
          <Field label="Port">
            <Select value={port} onChange={(e) => setPort(Number(e.target.value))}>
              <option value={587}>587 (TLS — recommended)</option>
              <option value={465}>465 (SSL)</option>
              <option value={25}>25 (none)</option>
            </Select>
          </Field>
        </div>

        <Field label="Encryption">
          <Select value={encryption} onChange={(e) => setEncryption(e.target.value as any)}>
            <option value="tls">TLS (recommended)</option>
            <option value="ssl">SSL</option>
            <option value="none">None</option>
          </Select>
        </Field>

        <Field label="Gmail / SMTP Username">
          <Input
            type="email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </Field>

        <Field label="Password / App Password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={existing ? "Leave blank to keep existing password" : ""}
          />
        </Field>
        <p className="text-xs text-pine-deep -mt-2">
          For Gmail: use a 16-character App Password, not your Google account password.
        </p>

        <Field label="Sender Name">
          <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} required />
        </Field>

        {message && (
          <p className={`rounded-lg px-3 py-2 text-sm ${message.type === "ok" ? "bg-sage-soft text-pine-deep" : "bg-rust-soft text-rust"}`}>
            {message.text}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save SMTP Settings"}
          </Button>
          {existing && (
            <Button type="button" variant="secondary" onClick={handleTest} disabled={testing}>
              {testing ? "Testing…" : "Test connection"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
