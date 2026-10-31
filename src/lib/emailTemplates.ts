import { renderTemplate } from "./csvRules";

type Mail = { type: "announcement" | "activity" | "grade"; grade_variant: "midterm" | "finals" | "midterm_finals" | null; title: string; body_template: string };

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] ?? character));
const renderedText = (template: string, recipient: Record<string, string | null>) => escapeHtml(renderTemplate(template || "", recipient)).replace(/\r?\n/g, "<br>");

function gradeTable(label: string, grade: string | null, equivalent: string | null, remarks: string | null) {
  return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e4e7ec;border-radius:8px;border-collapse:separate;overflow:hidden;margin:0 0 18px"><tr><td colspan="2" style="padding:10px 14px;background:#f5f3ff;color:#3730a3;font-size:13px;font-weight:700">' + escapeHtml(label) + '</td></tr><tr><td style="width:42%;padding:10px 14px;background:#f8fafc;color:#667085;font-size:13px">Grade</td><td style="padding:10px 14px;color:#3730a3;font-size:14px;font-weight:700">' + escapeHtml(grade || "—") + '</td></tr><tr><td style="padding:10px 14px;background:#f8fafc;color:#667085;font-size:13px">Equivalent grade</td><td style="padding:10px 14px;color:#3730a3;font-size:14px;font-weight:700">' + escapeHtml(equivalent || "—") + '</td></tr><tr><td style="padding:10px 14px;background:#f8fafc;color:#667085;font-size:13px">Remarks</td><td style="padding:10px 14px;color:#172033;font-size:14px">' + escapeHtml(remarks || "—") + '</td></tr></table>';
}

export function buildEmailHtml(mail: Mail, recipient: Record<string, string | null>, subjectName: string, senderName: string) {
  const title = escapeHtml(renderTemplate(mail.title, recipient));
  let content: string;
  if (mail.type === "grade") {
    const tables = mail.grade_variant === "midterm_finals" ? gradeTable("Midterm", recipient.midterm_grade, recipient.midterm_equivalent_grade, recipient.midterm_remarks) + gradeTable("Finals", recipient.finals_grade, recipient.finals_equivalent_grade, recipient.finals_remarks) : mail.grade_variant === "finals" ? gradeTable("Finals", recipient.finals_grade, recipient.finals_equivalent_grade, recipient.finals_remarks) : gradeTable("Midterm", recipient.midterm_grade, recipient.midterm_equivalent_grade, recipient.midterm_remarks);
    content = tables + '<p style="margin:0;color:#667085;font-size:13px;line-height:1.6">' + renderedText(mail.body_template, recipient) + '</p>';
  } else {
    // The composed body includes the greeting and activity details. Rendering
    // only that content keeps the sent message identical to its preview.
    content = '<div style="color:#344054;font-size:14px;line-height:1.65">' + renderedText(mail.body_template, recipient) + '</div>';
  }
  return '<!doctype html><html><body style="margin:0;padding:24px;background:#f7f8fc;font-family:Arial,Helvetica,sans-serif;color:#172033"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;overflow:hidden;border:1px solid #e4e7ec;border-radius:12px;background:#ffffff"><tr><td style="padding:28px 30px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff"><div style="font-size:22px;font-weight:700;line-height:1.25">' + title + '</div><div style="margin-top:7px;font-size:14px;opacity:.9">' + escapeHtml(subjectName) + '</div></td></tr><tr><td style="padding:28px 30px">' + content + '</td></tr><tr><td style="padding:14px 30px;background:#f8fafc;border-top:1px solid #e4e7ec;color:#667085;font-size:12px;text-align:center">Sent via ' + escapeHtml(senderName) + '</td></tr></table></td></tr></table></body></html>';
}
