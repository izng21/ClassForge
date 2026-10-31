import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedAttendance } from "@/lib/attendance";

const PAGE_WIDTH = 792;
const PAGE_HEIGHT = 612;
const MARGIN = 42;
const TABLE_WIDTH = PAGE_WIDTH - MARGIN * 2;
const ROW_HEIGHT = 22;
const columns = [
  { label: "#", width: 28 },
  { label: "Last name", width: 88 },
  { label: "First name", width: 88 },
  { label: "Student number", width: 104 },
  { label: "Sign-in", width: 200 },
  { label: "Sign-out", width: 200 },
];

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}

function fit(text: string, font: PDFFont, size: number, width: number) {
  if (font.widthOfTextAtSize(text, size) <= width) return text;
  let end = text.length;
  while (end > 0 && font.widthOfTextAtSize(text.slice(0, end) + "…", size) > width) end--;
  return text.slice(0, end) + "…";
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;
  const session = await getOwnedAttendance(id, user.userId);
  if (!session) return NextResponse.json({ error: "Attendance session not found." }, { status: 404 });

  const rows = await db.query<any>(
    `SELECT r.*, a.sign_in_at, a.sign_out_at
     FROM attendance_roster r
     LEFT JOIN attendance_records a ON a.roster_id = r.id AND a.session_id = r.session_id
     WHERE r.session_id = ?
     ORDER BY LOWER(TRIM(r.last_name)), LOWER(TRIM(r.first_name)), r.student_number`,
    [id]
  );

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const textColor = rgb(0.09, 0.13, 0.2);
  const muted = rgb(0.4, 0.44, 0.52);
  const purple = rgb(0.31, 0.27, 0.9);
  const border = rgb(0.89, 0.91, 0.94);
  const headerFill = rgb(0.93, 0.95, 1);
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  let pageNumber = 1;

  const drawFooter = () => {
    page.drawLine({ start: { x: MARGIN, y: 30 }, end: { x: PAGE_WIDTH - MARGIN, y: 30 }, thickness: 0.5, color: border });
    page.drawText("ClassForge attendance report", { x: MARGIN, y: 18, size: 8, font: regular, color: muted });
    const pageLabel = "Page " + pageNumber;
    page.drawText(pageLabel, { x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(pageLabel, 8), y: 18, size: 8, font: regular, color: muted });
  };

  const drawHeader = () => {
    page.drawText(session.name, { x: MARGIN, y, size: 20, font: bold, color: purple });
    y -= 22;
    page.drawText(session.subject_name + " • " + formatDate(session.created_at), { x: MARGIN, y, size: 10, font: regular, color: textColor });
    y -= 24;
    page.drawRectangle({ x: MARGIN, y: y - ROW_HEIGHT + 5, width: TABLE_WIDTH, height: ROW_HEIGHT, color: headerFill, borderColor: border, borderWidth: 0.7 });
    let x = MARGIN;
    columns.forEach((column) => {
      page.drawText(column.label, { x: x + 7, y: y - 9, size: 8, font: bold, color: textColor });
      x += column.width;
      if (x < MARGIN + TABLE_WIDTH) page.drawLine({ start: { x, y: y - ROW_HEIGHT + 5 }, end: { x, y: y + 5 }, thickness: 0.5, color: border });
    });
    y -= ROW_HEIGHT;
  };

  const newPage = () => {
    drawFooter();
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageNumber++;
    y = PAGE_HEIGHT - MARGIN;
    drawHeader();
  };

  drawHeader();
  rows.forEach((row, index) => {
    if (y - ROW_HEIGHT < 48) newPage();
    page.drawRectangle({ x: MARGIN, y: y - ROW_HEIGHT + 5, width: TABLE_WIDTH, height: ROW_HEIGHT, borderColor: border, borderWidth: 0.5 });
    const values = [String(index + 1), row.last_name || "—", row.first_name || "—", row.student_number || "—", formatDate(row.sign_in_at), formatDate(row.sign_out_at)];
    let x = MARGIN;
    values.forEach((value, columnIndex) => {
      const column = columns[columnIndex];
      page.drawText(fit(value, regular, 8, column.width - 12), { x: x + 7, y: y - 9, size: 8, font: regular, color: textColor });
      x += column.width;
      if (x < MARGIN + TABLE_WIDTH) page.drawLine({ start: { x, y: y - ROW_HEIGHT + 5 }, end: { x, y: y + 5 }, thickness: 0.5, color: border });
    });
    y -= ROW_HEIGHT;
  });

  const present = rows.filter((row) => row.sign_in_at).length;
  const summary = "Present: " + present + "   Absent: " + (rows.length - present) + "   Total: " + rows.length;
  if (y < 58) newPage();
  page.drawText(summary, { x: MARGIN, y: y - 12, size: 9, font: bold, color: textColor });
  drawFooter();

  const bytes = await pdf.save();
  return new NextResponse(Uint8Array.from(bytes).buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="attendance-${id}.pdf"`,
    },
  });
}
