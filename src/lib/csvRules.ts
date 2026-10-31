export type MailType = "announcement" | "activity" | "grade";
export type GradeVariant = "midterm" | "finals" | "midterm_finals" | null;

export type ParsedRecipient = {
  row_number: number;
  student_number: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  activity: string | null;
  midterm_grade: string | null;
  midterm_equivalent_grade: string | null;
  midterm_remarks: string | null;
  finals_grade: string | null;
  finals_equivalent_grade: string | null;
  finals_remarks: string | null;
  row_status: "valid" | "error";
  error_reason: string | null;
};

// The exact, required header set per mail type/variant. Order doesn't matter,
// but every column here must be present in the uploaded CSV's header row.
export function expectedColumns(type: MailType, gradeVariant: GradeVariant): string[] {
  const base = ["student_number", "first_name", "last_name", "email"];
  if (type === "announcement") return base;
  if (type === "activity") return [...base, "activity"];
  if (type === "grade") {
    if (gradeVariant === "midterm") return [...base, "midterm_grade", "midterm_equivalent_grade", "midterm_remarks"];
    if (gradeVariant === "finals") return [...base, "finals_grade", "finals_equivalent_grade", "finals_remarks"];
    if (gradeVariant === "midterm_finals") return [...base, "midterm_grade", "midterm_equivalent_grade", "midterm_remarks", "finals_grade", "finals_equivalent_grade", "finals_remarks"];
    throw new Error("grade_variant is required when type is 'grade'");
  }
  throw new Error(`Unknown mail type: ${type}`);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateHeader(
  headers: string[],
  type: MailType,
  gradeVariant: GradeVariant
): { ok: true } | { ok: false; missing: string[]; unexpected: string[] } {
  const expected = expectedColumns(type, gradeVariant);
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
  const missing = expected.filter((c) => !normalizedHeaders.includes(c));
  const unexpected = normalizedHeaders.filter((h) => h && !expected.includes(h));
  if (missing.length > 0) return { ok: false, missing, unexpected };
  return { ok: true };
}

/**
 * Validates one CSV row (already parsed into a plain object keyed by lowercased header).
 * Returns the row flagged valid/error with a human-readable reason if invalid.
 * Errors here mean the professor must fix the CSV and re-upload (no inline editing, v1).
 */
export function validateRow(
  raw: Record<string, string>,
  rowNumber: number,
  type: MailType,
  gradeVariant: GradeVariant
): ParsedRecipient {
  const get = (key: string) => (raw[key] ?? "").trim() || null;

  const student_number = get("student_number");
  const first_name = get("first_name");
  const last_name = get("last_name");
  const email = get("email");
  const activity = type === "activity" ? get("activity") : null;
  const midterm_grade =
    type === "grade" && gradeVariant !== "finals" ? get("midterm_grade") : null;
  const midterm_equivalent_grade =
    type === "grade" && gradeVariant !== "finals" ? get("midterm_equivalent_grade") : null;
  const midterm_remarks =
    type === "grade" && gradeVariant !== "finals" ? get("midterm_remarks") : null;
  const finals_grade =
    type === "grade" && gradeVariant !== "midterm" ? get("finals_grade") : null;
  const finals_equivalent_grade =
    type === "grade" && gradeVariant !== "midterm" ? get("finals_equivalent_grade") : null;
  const finals_remarks =
    type === "grade" && gradeVariant !== "midterm" ? get("finals_remarks") : null;

  const reasons: string[] = [];
  if (!student_number) reasons.push("missing student_number");
  if (!first_name) reasons.push("missing first_name");
  if (!last_name) reasons.push("missing last_name");
  if (!email) reasons.push("missing email");
  else if (!EMAIL_RE.test(email)) reasons.push("invalid email format");

  if (type === "activity" && !activity) reasons.push("missing activity");
  if (type === "grade") {
    if (gradeVariant !== "finals" && !midterm_grade) reasons.push("missing midterm_grade");
    if (gradeVariant !== "midterm" && !finals_grade) reasons.push("missing finals_grade");
    if (gradeVariant !== "finals" && !midterm_equivalent_grade) reasons.push("missing midterm_equivalent_grade");
    if (gradeVariant !== "midterm" && !finals_equivalent_grade) reasons.push("missing finals_equivalent_grade");
    if (midterm_grade && !isValidGrade(midterm_grade)) reasons.push("invalid midterm_grade");
    if (finals_grade && !isValidGrade(finals_grade)) reasons.push("invalid finals_grade");
  }

  return {
    row_number: rowNumber,
    student_number,
    first_name,
    last_name,
    email,
    activity,
    midterm_grade,
    midterm_equivalent_grade,
    midterm_remarks,
    finals_grade,
    finals_equivalent_grade,
    finals_remarks,
    row_status: reasons.length > 0 ? "error" : "valid",
    error_reason: reasons.length > 0 ? reasons.join("; ") : null,
  };
}

function isValidGrade(value: string): boolean {
  // Accepts plain numeric grades (e.g. 75, 95.5). Adjust if the school uses letter grades.
  return /^\d{1,3}(\.\d{1,2})?$/.test(value) && Number(value) >= 0 && Number(value) <= 100;
}

// Fields available as {{placeholder}} merge tags per mail type, shown in the compose UI.
export function mergeFieldsFor(type: MailType, gradeVariant: GradeVariant): string[] {
  const base = ["student_number", "first_name", "last_name", "email"];
  if (type === "announcement") return base;
  if (type === "activity") return [...base, "activity"];
  if (gradeVariant === "midterm") return [...base, "midterm_grade", "midterm_equivalent_grade", "midterm_remarks"];
  if (gradeVariant === "finals") return [...base, "finals_grade", "finals_equivalent_grade", "finals_remarks"];
  return [...base, "midterm_grade", "midterm_equivalent_grade", "midterm_remarks", "finals_grade", "finals_equivalent_grade", "finals_remarks"];
}

export function renderTemplate(template: string, data: Record<string, string | null>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return data[key] ?? `{{${key}}}`;
  });
}
