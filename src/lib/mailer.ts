import nodemailer from "nodemailer";
import { db } from "./db";
import { decryptSecret } from "./crypto";

export type SmtpSettings = {
  host: string;
  port: number;
  encryption: "tls" | "ssl" | "none";
  username: string;
  password: string;
  senderName: string;
};

export async function getSmtpSettings(userId: number): Promise<SmtpSettings | null> {
  const rows = await db.query<any>(
    `SELECT host, port, encryption, username, encrypted_password, sender_name
     FROM smtp_settings WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    host: row.host,
    port: row.port,
    encryption: row.encryption,
    username: row.username,
    password: decryptSecret(row.encrypted_password),
    senderName: row.sender_name,
  };
}

export function buildTransport(settings: SmtpSettings) {
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.encryption === "ssl", // true for port 465, false for 587/STARTTLS
    requireTLS: settings.encryption === "tls",
    auth: {
      user: settings.username,
      pass: settings.password,
    },
  });
}

export async function verifySmtp(settings: SmtpSettings): Promise<void> {
  await buildTransport(settings).verify();
}

export async function sendTestEmail(settings: SmtpSettings, to: string) {
  const transport = buildTransport(settings);
  await transport.verify();
  await transport.sendMail({
    from: `"${settings.senderName}" <${settings.username}>`,
    to,
    subject: "ClassForge — SMTP test",
    text: "This is a test email confirming your SMTP settings are working.",
  });
}

export type SendOneResult = { recipientId: number; ok: boolean; error?: string };

/**
 * Sends emails one at a time with a delay between sends, to stay well under
 * Gmail's rate limits and avoid tripping spam heuristics from a burst.
 * Not a queue — fine for this scale (single professor, occasional sends).
 */
export async function sendBulk(
  settings: SmtpSettings,
  messages: { recipientId: number; to: string; subject: string; html: string }[],
  onProgress: (result: SendOneResult) => Promise<void>,
  delayMs = 800
): Promise<void> {
  const transport = buildTransport(settings);
  await transport.verify();

  for (const msg of messages) {
    try {
      await transport.sendMail({
        from: `"${settings.senderName}" <${settings.username}>`,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
      });
      await onProgress({ recipientId: msg.recipientId, ok: true });
    } catch (err: any) {
      await onProgress({
        recipientId: msg.recipientId,
        ok: false,
        error: err?.message || "Unknown send error",
      });
    }
    // Throttle between sends so Gmail doesn't rate-limit or flag the burst.
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
