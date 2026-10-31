import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSmtpSettings } from "@/lib/mailer";

async function getOwnedMail(mailId: string, userId: number) {
  const rows = await db.query<any>(
    `SELECT m.* FROM mails m
     JOIN subjects s ON s.id = m.subject_id
     WHERE m.id = ? AND s.user_id = ? LIMIT 1`,
    [mailId, userId]
  );
  return rows[0] || null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const mail = await getOwnedMail(id, session.userId);
  if (!mail) return NextResponse.json({ error: "Mail not found." }, { status: 404 });

  // Older send attempts could set this state before discovering that SMTP had
  // not been configured. Recover that impossible state when the editor loads.
  if (mail.status === "sending" && !(await getSmtpSettings(session.userId))) {
    await db.execute(
      "UPDATE mails SET status = CASE WHEN total_rows > 0 THEN 'validated' ELSE 'draft' END WHERE id = ?",
      [id]
    );
    mail.status = mail.total_rows > 0 ? "validated" : "draft";
  }

  const recipients = await db.query<any>(
    `SELECT id, row_number, student_number, first_name, last_name, email, activity,
            midterm_grade, midterm_equivalent_grade, midterm_remarks, finals_grade,
            finals_equivalent_grade, finals_remarks, row_status, error_reason, send_status, send_error, sent_at
     FROM mail_recipients WHERE mail_id = ? ORDER BY row_number ASC`,
    [id]
  );

  return NextResponse.json({ mail, recipients });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const mail = await getOwnedMail(id, session.userId);
  if (!mail) return NextResponse.json({ error: "Mail not found." }, { status: 404 });

  if (mail.status === "sending") {
    return NextResponse.json(
      { error: "This mail is currently being sent and can not be edited." },
      { status: 409 }
    );
  }

  const { title, emailSubject, bodyTemplate } = await req.json();
  await db.execute(
    `UPDATE mails SET title = ?, email_subject = ?, body_template = ? WHERE id = ?`,
    [title ?? mail.title, emailSubject ?? mail.email_subject, bodyTemplate ?? mail.body_template, id]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  const mail = await getOwnedMail(id, session.userId);
  if (!mail) return NextResponse.json({ error: "Mail not found." }, { status: 404 });

  await db.execute("DELETE FROM mails WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
