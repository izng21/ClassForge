import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { validateHeader, validateRow, GradeVariant, MailType } from "@/lib/csvRules";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const mails = await db.query<any>(
    `SELECT m.* FROM mails m JOIN subjects s ON s.id = m.subject_id
     WHERE m.id = ? AND s.user_id = ? LIMIT 1`,
    [id, session.userId]
  );
  const mail = mails[0];
  if (!mail) return NextResponse.json({ error: "Mail not found." }, { status: 404 });
  if (mail.status === "sent" || mail.status === "sending") {
    return NextResponse.json(
      { error: "This mail has already been sent; create a new one to send again." },
      { status: 409 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No CSV file uploaded." }, { status: 400 });
  }

  const text = await (file as File).text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return NextResponse.json(
      { error: "Could not parse the CSV file. Please check the file format." },
      { status: 400 }
    );
  }

  const headers = parsed.meta.fields || [];
  const type = mail.type as MailType;
  const gradeVariant = mail.grade_variant as GradeVariant;

  const headerCheck = validateHeader(headers, type, gradeVariant);
  if (!headerCheck.ok) {
    return NextResponse.json(
      {
        error: "CSV columns don't match what's expected for this mail type.",
        missing: headerCheck.missing,
        unexpected: headerCheck.unexpected,
      },
      { status: 400 }
    );
  }

  if (parsed.data.length === 0) {
    return NextResponse.json({ error: "The CSV file has no data rows." }, { status: 400 });
  }

  const validatedRows = parsed.data.map((row, index) =>
    validateRow(row, index + 1, type, gradeVariant)
  );

  const errorCount = validatedRows.filter((r) => r.row_status === "error").length;

  // Replace any previous upload for this mail with the new one.
  await db.execute("DELETE FROM mail_recipients WHERE mail_id = ?", [id]);

  for (const r of validatedRows) {
    await db.execute(
      `INSERT INTO mail_recipients
        (mail_id, row_number, student_number, first_name, last_name, email, activity,
         midterm_grade, midterm_equivalent_grade, midterm_remarks, finals_grade,
         finals_equivalent_grade, finals_remarks, row_status, error_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        r.row_number,
        r.student_number,
        r.first_name,
        r.last_name,
        r.email,
        r.activity,
        r.midterm_grade,
        r.midterm_equivalent_grade,
        r.midterm_remarks,
        r.finals_grade,
        r.finals_equivalent_grade,
        r.finals_remarks,
        r.row_status,
        r.error_reason,
      ]
    );
  }

  await db.execute(
    `UPDATE mails SET csv_filename = ?, total_rows = ?, status = ? WHERE id = ?`,
    [(file as File).name, validatedRows.length, errorCount > 0 ? "draft" : "validated", id]
  );

  return NextResponse.json({
    totalRows: validatedRows.length,
    errorCount,
    validCount: validatedRows.length - errorCount,
    canSend: errorCount === 0,
    rows: validatedRows,
  });
}
