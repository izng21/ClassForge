import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const rows = await db.query<any>(
    "SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await setSessionCookie({ userId: user.id, email: user.email });
  return NextResponse.json({ ok: true });
}
