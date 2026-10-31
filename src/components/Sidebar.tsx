"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

type Subject = { id: number; name: string; mail_count: number };
type Mail = { id: number; title: string };

function MenuIcon({ type }: { type: "menu" | "grid" | "settings" | "close" }) {
  const paths = {
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V20h-3v-.08A1.7 1.7 0 0 0 10.66 18.36a1.7 1.7 0 0 0-1.88.34l-.06.06L6.6 16.64l.06-.06A1.7 1.7 0 0 0 7 14.7a1.7 1.7 0 0 0-1.56-1.04H5v-3h.44A1.7 1.7 0 0 0 7 9.62a1.7 1.7 0 0 0-.34-1.88L6.6 7.68 8.72 5.56l.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11.7 4.4V4h3v.4a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06A1.7 1.7 0 0 0 19.4 9.62a1.7 1.7 0 0 0 1.56 1.04H21v3h-.04A1.7 1.7 0 0 0 19.4 15Z" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">{paths[type]}</svg>;
}

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [mails, setMails] = useState<Mail[]>([]);
  const [mailSubjectId, setMailSubjectId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { fetch("/api/subjects").then((res) => res.ok ? res.json() : null).then((data) => data && setSubjects(data.subjects)).catch(() => undefined); }, []);
  const subjectPathId = pathname.match(/^\/subjects\/(\d+)/)?.[1];
  const mailPathId = pathname.match(/^\/mails\/(\d+)/)?.[1];
  useEffect(() => { if (!mailPathId) return; fetch(`/api/mails/${mailPathId}`).then((res) => res.ok ? res.json() : null).then((data) => data && setMailSubjectId(String(data.mail.subject_id))).catch(() => undefined); }, [mailPathId]);
  const activeSubjectId = subjectPathId || mailSubjectId;
  useEffect(() => { if (!activeSubjectId) return; fetch(`/api/subjects/${activeSubjectId}`).then((res) => res.ok ? res.json() : null).then((data) => data && setMails(data.mails)).catch(() => undefined); }, [activeSubjectId]);
  const linkStyle = (active: boolean) => `nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${active ? "bg-accent-soft text-brass-deep" : "text-ink-soft hover:bg-paper hover:text-ink"}`;
  const body = <><div className="flex h-[72px] items-center gap-3 px-5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brass text-xs font-bold tracking-tight text-white">CF</span><div><p className="font-semibold tracking-tight text-ink">ClassForge</p><p className="text-[11px] font-medium text-ink-soft">Teaching workspace</p></div></div><nav className="flex-1 overflow-y-auto px-3 py-3"><Link href="/dashboard" className={`${linkStyle(pathname === "/dashboard")} mb-6`}><MenuIcon type="grid" />All subjects</Link><p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[.08em] text-ink-soft">Your subjects</p><div className="space-y-1">{subjects.map((subject) => { const active = activeSubjectId === String(subject.id); return <div key={subject.id}><Link href={`/subjects/${subject.id}`} className={linkStyle(active)}><span className="min-w-0 flex-1 truncate">{subject.name}</span><span className="text-xs text-ink-soft">{subject.mail_count}</span></Link>{active && mails.length > 0 && <div className="my-1 ml-5 space-y-1 border-l border-rule pl-3">{mails.slice(0, 5).map((mail) => <Link key={mail.id} href={`/mails/${mail.id}`} className={`block truncate py-1.5 text-xs ${pathname === `/mails/${mail.id}` ? "font-semibold text-brass-deep" : "text-ink-soft hover:text-ink"}`}>{mail.title}</Link>)}</div>}</div>; })}</div></nav><div className="border-t border-rule p-3"><Link href="/settings" className={linkStyle(pathname === "/settings")}><MenuIcon type="settings" />SMTP settings</Link><div className="mt-2 flex items-center justify-between px-3 py-2"><span className="max-w-40 truncate text-xs text-ink-soft">{email}</span><LogoutButton /></div></div></>;
  return <><aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-rule lg:bg-paper-raised">{body}</aside><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-rule bg-paper-raised px-5 lg:hidden"><Link href="/dashboard" className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brass text-[10px] font-bold text-white">CF</span><span className="font-semibold tracking-tight">ClassForge</span></Link><button aria-label="Open navigation" onClick={() => setOpen(true)} className="rounded-lg p-2 text-ink-soft hover:bg-paper hover:text-ink"><MenuIcon type="menu" /></button></header>{open && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/30" /><aside className="relative flex h-full w-[min(18rem,85vw)] flex-col bg-paper-raised shadow-xl">{body}<button aria-label="Close navigation" onClick={() => setOpen(false)} className="absolute right-3 top-5 rounded-lg p-2 text-ink-soft hover:bg-paper"><MenuIcon type="close" /></button></aside></div>}</>;
}
