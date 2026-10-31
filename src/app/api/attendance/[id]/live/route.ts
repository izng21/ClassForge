import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedAttendance } from "@/lib/attendance";
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(); if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 }); const { id } = await params;
  const session = await getOwnedAttendance(id, user.userId); if (!session) return NextResponse.json({ error: "Attendance session not found." }, { status: 404 });
  const roster = await db.query<any>(
    `SELECT r.*, a.sign_in_at, a.sign_out_at
     FROM attendance_roster r
     LEFT JOIN attendance_records a ON a.roster_id = r.id AND a.session_id = r.session_id
     WHERE r.session_id = ?
     ORDER BY LOWER(TRIM(r.last_name)), LOWER(TRIM(r.first_name)), r.student_number`,
    [id]
  );
  return NextResponse.json({ session, roster });
}
