import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSmtpSettings, sendBulk, verifySmtp } from "@/lib/mailer";
import { renderTemplate } from "@/lib/csvRules";
import { buildEmailHtml } from "@/lib/emailTemplates";

// Recipients sent per request, and the delay between individual sends within
// a batch. BATCH_SIZE * DELAY_MS should stay well under Vercel's Hobby-plan
// 10s function limit (10 * 500ms = 5s, leaving headroom for the SMTP round trips
// themselves). The frontend calls this endpoint repeatedly until `done: true`.
const BATCH_SIZE = 10;
const DELAY_MS = 500;

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

  const url = new URL(req.url);
  const retryFailed = url.searchParams.get("retryFailed") === "true";
  // The frontend passes start=true only on the very first call of a send run,
  // so we know to reset counters / flip status to "sending" exactly once.
  const isStart = url.searchParams.get("start") === "true";

  if (mail.status === "sent" && !retryFailed) {
    return NextResponse.json(
      { error: "This mail was already sent. Use retry to resend failed rows only." },
      { status: 409 }
    );
  }
  if (!mail.email_subject?.trim() || !mail.body_template?.trim()) {
    return NextResponse.json(
      { error: "Add a subject line and body before sending." },
      { status: 400 }
    );
  }

  const smtp = await getSmtpSettings(session.userId);
  if (!smtp) {
    return NextResponse.json(
      { error: "SMTP settings are not configured yet. Set them up first." },
      { status: 400 }
    );
  }

  if (isStart) {
    const errorRows = await db.query<any>(
      `SELECT COUNT(*) as c FROM mail_recipients WHERE mail_id = ? AND row_status = 'error'`,
      [id]
    );
    if (errorRows[0].c > 0) {
      return NextResponse.json(
        { error: "This mail still has flagged CSV rows. Fix and re-upload before sending." },
        { status: 409 }
      );
    }
    try {
      await verifySmtp(smtp);
    } catch {
      return NextResponse.json(
        { error: "Could not connect to your SMTP server. Check the settings and test the connection before sending." },
        { status: 400 }
      );
    }
    if (retryFailed) {
      await db.execute(
        `UPDATE mail_recipients SET send_status = 'pending', send_error = NULL
         WHERE mail_id = ? AND send_status = 'failed'`,
        [id]
      );
    }
    await db.execute("UPDATE mails SET status = 'sending' WHERE id = ?", [id]);
  }

  const subjects = await db.query<any>("SELECT name FROM subjects WHERE id = ? LIMIT 1", [mail.subject_id]);
  const subjectName = subjects[0]?.name || "Your class";

  const batch = await db.query<any>(
    `SELECT * FROM mail_recipients WHERE mail_id = ? AND row_status = 'valid' AND send_status = 'pending'
     ORDER BY row_number ASC LIMIT ?`,
    [id, BATCH_SIZE]
  );

  let batchSent = 0;
  let batchFailed = 0;

  if (batch.length > 0) {
    const messages = batch.map((r: any) => ({
      recipientId: r.id,
      to: r.email,
      subject: renderTemplate(mail.email_subject, r),
      html: buildEmailHtml(mail, r, subjectName, smtp.senderName),
    }));

    try {
      await sendBulk(
        smtp,
        messages,
        async (result) => {
        if (result.ok) {
          batchSent++;
          await db.execute(
            `UPDATE mail_recipients SET send_status = 'sent', sent_at = NOW() WHERE id = ?`,
            [result.recipientId]
          );
        } else {
          batchFailed++;
          await db.execute(
            `UPDATE mail_recipients SET send_status = 'failed', send_error = ? WHERE id = ?`,
            [result.error || "Unknown error", result.recipientId]
          );
        }
        },
        DELAY_MS
      );
    } catch {
      await db.execute("UPDATE mails SET status = 'failed' WHERE id = ?", [id]);
      return NextResponse.json(
        { error: "The SMTP connection was interrupted. No remaining messages will be sent; update your settings and try again." },
        { status: 502 }
      );
    }
  }

  // Remaining pending rows (not counting this batch, which is now settled)
  const remainingRows = await db.query<any>(
    `SELECT COUNT(*) as c FROM mail_recipients WHERE mail_id = ? AND row_status = 'valid' AND send_status = 'pending'`,
    [id]
  );
  const remaining = Number(remainingRows[0].c) || 0;
  const done = remaining === 0;

  const totals = await db.query<any>(
    `SELECT
       SUM(send_status = 'sent') AS sent,
       SUM(send_status = 'failed') AS failed
     FROM mail_recipients WHERE mail_id = ?`,
    [id]
  );
  const totalSent = Number(totals[0].sent) || 0;
  const totalFailed = Number(totals[0].failed) || 0;

  if (done) {
    const finalStatus = totalFailed > 0 && totalSent === 0 ? "failed" : "sent";
    await db.execute(
      `UPDATE mails SET status = ?, sent_count = ?, failed_count = ?, sent_at = NOW() WHERE id = ?`,
      [finalStatus, totalSent, totalFailed, id]
    );
  } else {
    await db.execute(`UPDATE mails SET sent_count = ?, failed_count = ? WHERE id = ?`, [
      totalSent,
      totalFailed,
      id,
    ]);
  }

  return NextResponse.json({
    done,
    remaining,
    batchSent,
    batchFailed,
    totalSent,
    totalFailed,
  });
}
