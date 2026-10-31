"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Field, Input } from "@/components/ui";

type Subject = { id: number; name: string; created_at: string; mail_count: number };

export default function DashboardPage() {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/subjects");
    if (res.status === 401) { window.location.href = "/login"; return; }
    const data = await res.json();
    setSubjects(data.subjects);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true); setError(null);
    const res = await fetch("/api/subjects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName }) });
    setCreating(false);
    if (!res.ok) { const data = await res.json(); setError(data.error); return; }
    setNewName(""); load();
  }

  const totalMails = subjects?.reduce((sum, subject) => sum + subject.mail_count, 0) ?? 0;
  const newest = subjects?.length ? new Date(Math.max(...subjects.map((subject) => new Date(subject.created_at).getTime()))) : null;

  return <div className="page-shell">
    <div className="mb-8 flex flex-col gap-2 border-b border-rule pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-sm font-medium text-brass">Workspace overview</p><h1 className="text-[28px] font-semibold">Your subjects</h1><p className="mt-2 text-sm text-ink-soft">Each subject holds its own announcements, activities, and grade mails.</p></div><p className="text-sm text-ink-soft">Manage class communication in one place.</p></div>

    {subjects && subjects.length > 0 && <div className="mb-8 grid gap-4 sm:grid-cols-3"><SummaryCard label="Total subjects" value={subjects.length} detail="Classes in your workspace" icon="▦" /><SummaryCard label="Mail campaigns" value={totalMails} detail="Across all subjects" icon="✉" /><SummaryCard label="Recently added" value={newest?.toLocaleDateString(undefined, { month: "short", day: "numeric" }) ?? "—"} detail="Keep your workspace organized" icon="◷" /></div>}

    <form onSubmit={handleCreate} className="panel mb-8 flex flex-col gap-3 p-5 sm:flex-row sm:items-end"><div className="flex-1"><Field label="New subject name"><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Web Development 101" /></Field></div><Button type="submit" disabled={creating}>{creating ? "Adding…" : "Add subject"}</Button></form>
    {error && <p className="-mt-6 mb-6 text-sm text-rust">{error}</p>}
    {subjects === null && <p className="text-sm text-ink-soft">Loading subjects…</p>}
    {subjects && subjects.length === 0 && <div className="panel p-10 text-center"><span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef2ff] text-xl text-brass">▦</span><h2 className="font-semibold">Your workspace is ready</h2><p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">Create your first subject above, then add a mail campaign whenever you&apos;re ready to contact your class.</p></div>}
    {subjects && subjects.length > 0 && <div className="grid gap-4 sm:grid-cols-2">{subjects.map((subject) => <Link key={subject.id} href={`/subjects/${subject.id}`} className="panel group block p-5 transition hover:-translate-y-0.5 hover:border-brass/30 hover:shadow-md"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.08em] text-ink-soft">Subject</p><h2 className="mt-1 text-lg font-semibold group-hover:text-brass-deep">{subject.name}</h2></div><span className="rounded-lg bg-[#eef2ff] px-2.5 py-1 text-xs font-semibold text-brass-deep">Open →</span></div><div className="mt-6 flex items-end justify-between border-t border-rule-soft pt-4"><div><p className="text-2xl font-semibold text-brass-deep">{subject.mail_count}</p><p className="text-xs text-ink-soft">mail {subject.mail_count === 1 ? "campaign" : "campaigns"}</p></div><p className="text-right text-xs text-ink-soft"><span className="block font-medium text-ink">Created</span>{new Date(subject.created_at).toLocaleDateString()}</p></div></Link>)}</div>}
  </div>;
}

function SummaryCard({ label, value, detail, icon }: { label: string; value: string | number; detail: string; icon: string }) {
  return <div className="panel p-4"><div className="flex items-start justify-between"><p className="text-sm font-medium text-ink-soft">{label}</p><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef2ff] text-brass">{icon}</span></div><p className="mt-3 text-2xl font-semibold text-ink">{value}</p><p className="mt-1 text-xs text-ink-soft">{detail}</p></div>;
}
