import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signAttendanceQr } from "@/lib/attendance";
const attempts = new Map<string, { count: number; reset: number }>();
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local"; const item = attempts.get(ip); const now = Date.now(); if (item && item.reset > now && item.count >= 12) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 }); attempts.set(ip, item && item.reset > now ? { ...item, count: item.count + 1 } : { count: 1, reset: now + 60_000 });
  const { token } = await params; const { student_number, first_name, last_name } = await req.json(); const clean = (v: unknown) => String(v || "").trim(); if (!clean(student_number) || !clean(first_name) || !clean(last_name)) return NextResponse.json({ error: "Enter your student number and full name." }, { status: 400 });
  const sessions = await db.query<any>("SELECT id, name, status FROM attendance_sessions WHERE public_token = ? LIMIT 1", [token]); const session = sessions[0]; if (!session) return NextResponse.json({ error: "Attendance session not found." }, { status: 404 }); if (session.status !== "open") return NextResponse.json({ error: "This session is closed." }, { status: 409 });
  const roster = await db.query<any>("SELECT id, first_name, last_name FROM attendance_roster WHERE session_id = ? AND student_number = ? AND LOWER(TRIM(first_name)) = LOWER(?) AND LOWER(TRIM(last_name)) = LOWER(?) LIMIT 1", [session.id, clean(student_number), clean(first_name), clean(last_name)]);
  if (!roster[0]) return NextResponse.json({ error: "Those details do not match this session's roster." }, { status: 400 });
  return NextResponse.json({ payload: signAttendanceQr(session.id, roster[0].id), name: `${roster[0].first_name} ${roster[0].last_name}`, sessionName: session.name });
}
