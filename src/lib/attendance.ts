import crypto from "crypto";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

export type AttendanceMode = "in" | "out";

export async function getOwnedAttendance(id: string, userId: number) {
  const rows = await db.query<any>(`SELECT a.*, s.name AS subject_name FROM attendance_sessions a JOIN subjects s ON s.id = a.subject_id WHERE a.id = ? AND s.user_id = ? LIMIT 1`, [id, userId]);
  return rows[0] || null;
}

export const newPublicToken = () => crypto.randomBytes(24).toString("base64url");

export function signAttendanceQr(sessionId: number, rosterId: number) {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error("APP_SECRET is not set.");
  return jwt.sign({ scope: "attendance", sessionId, rosterId }, secret, { expiresIn: "12h" });
}

export function verifyAttendanceQr(token: string) {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error("APP_SECRET is not set.");
  const value = jwt.verify(token, secret) as { scope?: string; sessionId?: number; rosterId?: number };
  if (value.scope !== "attendance" || !value.sessionId || !value.rosterId) throw new Error("Invalid attendance QR.");
  return { sessionId: value.sessionId, rosterId: value.rosterId };
}
