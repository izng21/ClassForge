import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedAttendance } from "@/lib/attendance";
const columns = ["student_number", "first_name", "last_name"];
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(); if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 }); const { id } = await params;
  const session = await getOwnedAttendance(id, user.userId); if (!session) return NextResponse.json({ error: "Attendance session not found." }, { status: 404 });
  const file = (await req.formData()).get("file"); if (!file || typeof file === "string") return NextResponse.json({ error: "Upload a CSV file." }, { status: 400 });
  const parsed = Papa.parse<Record<string, string>>(await (file as File).text(), { header: true, skipEmptyLines: true, transformHeader: h => h.trim().toLowerCase() }); const headers = parsed.meta.fields || [];
  const missing = columns.filter(c => !headers.includes(c)); const unexpected = headers.filter(c => !columns.includes(c));
  if (missing.length || unexpected.length) return NextResponse.json({ error: "CSV columns must exactly match the attendance roster template.", missing, unexpected }, { status: 400 });
  const seen = new Set<string>(); const rows = parsed.data.map((raw, index) => { const row: Record<string, string> = Object.fromEntries(columns.map(c => [c, (raw[c] || "").trim()])); const reasons = columns.filter(c => !row[c]).map(c => `missing ${c}`); if (row.student_number && seen.has(row.student_number.toLowerCase())) reasons.push("duplicate student_number"); seen.add(row.student_number.toLowerCase()); return { ...row, row_number: index + 1, row_status: reasons.length ? "error" : "valid", error_reason: reasons.join("; ") || null }; });
  if (rows.some(row => row.row_status === "error")) return NextResponse.json({ error: "Fix flagged roster rows and upload again.", rows }, { status: 400 });
  await db.execute("DELETE FROM attendance_roster WHERE session_id = ?", [id]);
  for (const row of rows) { const values = row as unknown as Record<string, string>; await db.execute("INSERT INTO attendance_roster (session_id, student_number, first_name, last_name) VALUES (?, ?, ?, ?)", [id, values["student_number"], values["first_name"], values["last_name"]]); }
  return NextResponse.json({ rows, validCount: rows.length });
}
