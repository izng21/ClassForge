import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSmtpSettings, sendTestEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const settings = await getSmtpSettings(session.userId);
  if (!settings) {
    return NextResponse.json({ error: "Save SMTP settings first." }, { status: 400 });
  }

  const { to } = await req.json();

  try {
    if (to) {
      await sendTestEmail(settings, to);
      return NextResponse.json({ ok: true, message: `Test email sent to ${to}.` });
    }
    const { buildTransport } = await import("@/lib/mailer");
    await buildTransport(settings).verify();
    return NextResponse.json({ ok: true, message: "Connection verified." });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "SMTP connection failed. Check your host, port, and password." },
      { status: 400 }
    );
  }
}
