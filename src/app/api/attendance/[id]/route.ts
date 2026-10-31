import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedAttendance } from "@/lib/attendance";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(); if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 }); const { id } = await params;
  const session = await getOwnedAttendance(id, user.userId); if (!session) return NextResponse.json({ error: "Attendance session not found." }, { status: 404 });
  return NextResponse.json({ session });
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(); if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 }); const { id } = await params;
  const session = await getOwnedAttendance(id, user.userId); if (!session) return NextResponse.json({ error: "Attendance session not found." }, { status: 404 });
  const { status, name } = await req.json(); if (status && !["open", "closed"].includes(status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  await db.execute("UPDATE attendance_sessions SET status = ?, name = ? WHERE id = ?", [status || session.status, name?.trim() || session.name, id]); return NextResponse.json({ ok: true });
}
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(); if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 }); const { id } = await params;
  const session = await getOwnedAttendance(id, user.userId); if (!session) return NextResponse.json({ error: "Attendance session not found." }, { status: 404 }); await db.execute("DELETE FROM attendance_sessions WHERE id = ?", [id]); return NextResponse.json({ ok: true });
}
