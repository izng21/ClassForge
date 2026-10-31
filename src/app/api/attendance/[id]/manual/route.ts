import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedAttendance } from "@/lib/attendance";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;
  const session = await getOwnedAttendance(id, user.userId);
  if (!session) return NextResponse.json({ error: "Attendance session not found." }, { status: 404 });
  if (session.status !== "open") return NextResponse.json({ error: "This session is closed." }, { status: 409 });

  try {
    const { studentNumber, firstName, lastName, mode } = await req.json();
    if (mode !== "in" && mode !== "out") throw new Error("Invalid attendance mode.");
    if (![studentNumber, firstName, lastName].every((value) => typeof value === "string" && value.trim())) {
      throw new Error("Enter the student number, first name, and last name.");
    }

    const roster = await db.query<any>(
      `SELECT * FROM attendance_roster
       WHERE session_id = ? AND student_number = ?
         AND LOWER(TRIM(first_name)) = LOWER(TRIM(?))
         AND LOWER(TRIM(last_name)) = LOWER(TRIM(?))
       LIMIT 1`,
      [id, studentNumber.trim(), firstName.trim(), lastName.trim()]
    );
    const student = roster[0];
    if (!student) throw new Error("These details do not match this session's roster.");

    const records = await db.query<any>(
      "SELECT * FROM attendance_records WHERE session_id = ? AND roster_id = ?",
      [id, student.id]
    );
    const record = records[0];
    if (mode === "in") {
      if (record?.sign_in_at) return NextResponse.json({ error: "Already signed in.", student, time: record.sign_in_at }, { status: 409 });
      if (record) await db.execute("UPDATE attendance_records SET sign_in_at = NOW() WHERE id = ?", [record.id]);
      else await db.execute("INSERT INTO attendance_records (session_id, roster_id, sign_in_at) VALUES (?, ?, NOW())", [id, student.id]);
    } else {
      if (!record?.sign_in_at) return NextResponse.json({ error: "Student has not signed in.", student }, { status: 409 });
      if (record.sign_out_at) return NextResponse.json({ error: "Already signed out.", student, time: record.sign_out_at }, { status: 409 });
      await db.execute("UPDATE attendance_records SET sign_out_at = NOW() WHERE id = ?", [record.id]);
    }

    return NextResponse.json({ ok: true, student, mode, source: "manual" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not record manual attendance." }, { status: 400 });
  }
}
