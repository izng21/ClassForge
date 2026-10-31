import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const subjects = await db.query<any>(
    `SELECT s.id, s.name, s.created_at,
            (SELECT COUNT(*) FROM mails m WHERE m.subject_id = s.id) AS mail_count
     FROM subjects s
     WHERE s.user_id = ?
     ORDER BY s.created_at DESC`,
    [session.userId]
  );
  return NextResponse.json({ subjects });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { name } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Subject name is required." }, { status: 400 });
  }

  const result = await db.execute("INSERT INTO subjects (user_id, name) VALUES (?, ?)", [
    session.userId,
    name.trim(),
  ]);
  return NextResponse.json({ id: result.insertId, name: name.trim() }, { status: 201 });
}
