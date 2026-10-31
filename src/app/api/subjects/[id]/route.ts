import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const subjects = await db.query<any>(
    "SELECT id, name, created_at FROM subjects WHERE id = ? AND user_id = ? LIMIT 1",
    [id, session.userId]
  );
  if (subjects.length === 0) {
    return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  }

  const mails = await db.query<any>(
    `SELECT id, type, grade_variant, title, status, total_rows, sent_count, failed_count, created_at, sent_at
     FROM mails WHERE subject_id = ? ORDER BY created_at DESC`,
    [id]
  );

  const attendance = await db.query<any>(`SELECT a.id, a.name, a.status, a.created_at, COUNT(r.id) AS roster_size, SUM(ar.sign_in_at IS NOT NULL) AS present_count FROM attendance_sessions a LEFT JOIN attendance_roster r ON r.session_id = a.id LEFT JOIN attendance_records ar ON ar.roster_id = r.id AND ar.session_id = a.id WHERE a.subject_id = ? GROUP BY a.id ORDER BY a.created_at DESC`, [id]);

  return NextResponse.json({ subject: subjects[0], mails, attendance });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  await db.execute("DELETE FROM subjects WHERE id = ? AND user_id = ?", [id, session.userId]);
  return NextResponse.json({ ok: true });
}
