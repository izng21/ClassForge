import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const LOGIN_PATH = "/login";
const LOGIN_API_PATH = "/api/auth/login";

function hasValidSession(req: NextRequest): boolean {
  const token = req.cookies.get("session")?.value;
  const secret = process.env.APP_SECRET;

  if (!token || !secret) return false;

  try {
    jwt.verify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const validSession = hasValidSession(req);

  // Do not render the sign-in form for a user who already has a session.
  if (pathname === LOGIN_PATH) {
    return validSession
      ? NextResponse.redirect(new URL("/dashboard", req.url))
      : NextResponse.next();
  }

  // Student attendance links and their QR endpoint are intentionally public.
  if (pathname === LOGIN_API_PATH || pathname.startsWith("/attend/") || pathname.startsWith("/api/attend/") || validSession) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  return NextResponse.redirect(new URL(LOGIN_PATH, req.url));
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/subjects/:path*",
    "/mails/:path*",
    "/attendance/:path*",
    "/attend/:path*",
    "/settings/:path*",
    "/api/:path*",
  ],
};
