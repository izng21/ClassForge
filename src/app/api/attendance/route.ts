import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { newPublicToken } from "@/lib/attendance";

export async function POST(req: NextRequest) {
  const user = await getSession(); if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { subjectId, name } = await req.json();
  if (!subjectId || !name?.trim()) return NextResponse.json({ error: "A subject and session name are required." }, { status: 400 });
  const subject = await db.query<any>("SELECT id FROM subjects WHERE id = ? AND user_id = ?", [subjectId, user.userId]);
  if (!subject[0]) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  const result = await db.execute("INSERT INTO attendance_sessions (subject_id, name, public_token) VALUES (?, ?, ?)", [subjectId, name.trim(), newPublicToken()]);
  return NextResponse.json({ id: result.insertId }, { status: 201 });
}
