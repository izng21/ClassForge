import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { getSmtpSettings, sendTestEmail } from "@/lib/mailer";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const rows = await db.query<any>(
    `SELECT host, port, encryption, username, sender_name, updated_at
     FROM smtp_settings WHERE user_id = ? LIMIT 1`,
    [session.userId]
  );
  // Password is never returned to the client, by design.
  return NextResponse.json({ settings: rows[0] || null });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { host, port, encryption, username, password, senderName } = await req.json();

  if (!host || !port || !encryption || !username || !senderName) {
    return NextResponse.json(
      { error: "Host, port, encryption, username, and sender name are required." },
      { status: 400 }
    );
  }

  const existing = await db.query<any>(
    "SELECT id, encrypted_password FROM smtp_settings WHERE user_id = ? LIMIT 1",
    [session.userId]
  );

  // "Leave blank to keep existing password" — only re-encrypt when a new one is provided.
  let encryptedPassword: string;
  if (password && password.trim()) {
    encryptedPassword = encryptSecret(password.trim());
  } else if (existing[0]) {
    encryptedPassword = existing[0].encrypted_password;
  } else {
    return NextResponse.json(
      { error: "Password / App Password is required for first-time setup." },
      { status: 400 }
    );
  }

  if (existing[0]) {
    await db.execute(
      `UPDATE smtp_settings SET host = ?, port = ?, encryption = ?, username = ?,
        encrypted_password = ?, sender_name = ? WHERE user_id = ?`,
      [host, port, encryption, username, encryptedPassword, senderName, session.userId]
    );
  } else {
    await db.execute(
      `INSERT INTO smtp_settings (user_id, host, port, encryption, username, encrypted_password, sender_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [session.userId, host, port, encryption, username, encryptedPassword, senderName]
    );
  }

  return NextResponse.json({ ok: true });
}
