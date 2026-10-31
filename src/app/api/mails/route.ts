import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { subjectId, type, gradeVariant, title } = await req.json();

  if (!subjectId || !type || !title?.trim()) {
    return NextResponse.json(
      { error: "subjectId, type, and title are required." },
      { status: 400 }
    );
  }
  if (!["announcement", "activity", "grade"].includes(type)) {
    return NextResponse.json({ error: "Invalid mail type." }, { status: 400 });
  }
  if (type === "grade" && !["midterm", "finals", "midterm_finals"].includes(gradeVariant)) {
    return NextResponse.json(
      { error: "gradeVariant is required for grade mails (midterm, finals, or midterm_finals)." },
      { status: 400 }
    );
  }

  // Confirm the subject belongs to this professor.
  const subjects = await db.query<any>(
    "SELECT id FROM subjects WHERE id = ? AND user_id = ? LIMIT 1",
    [subjectId, session.userId]
  );
  if (subjects.length === 0) {
    return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  }

  const result = await db.execute(
    `INSERT INTO mails (subject_id, type, grade_variant, title)
     VALUES (?, ?, ?, ?)`,
    [subjectId, type, type === "grade" ? gradeVariant : null, title.trim()]
  );

  return NextResponse.json({ id: result.insertId }, { status: 201 });
}
