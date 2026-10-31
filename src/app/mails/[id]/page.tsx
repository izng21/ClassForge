"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Breadcrumbs, Button, Field, Input, StatusPill, Stepper, Textarea } from "@/components/ui";
import { AnnouncementMailView } from "@/components/mail-types/AnnouncementMailView";
import { ActivityMailView } from "@/components/mail-types/ActivityMailView";
import { GradeMailView } from "@/components/mail-types/GradeMailView";

type Mail = {
  id: number;
  subject_id: number;
  type: "announcement" | "activity" | "grade";
  grade_variant: string | null;
  title: string;
  email_subject: string;
  body_template: string;
  csv_filename: string | null;
  status: string;
  total_rows: number;
  sent_count: number;
  failed_count: number;
};

type Recipient = {
  id: number;
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
  send_status: "pending" | "sent" | "failed" | "excluded";
  send_error: string | null;
};

function expectedColumns(type: string, gradeVariant: string | null): string[] {
  const base = ["student_number", "first_name", "last_name", "email"];
  if (type === "announcement") return base;
  if (type === "activity") return [...base, "activity"];
  if (gradeVariant === "midterm") return [...base, "midterm_grade", "midterm_equivalent_grade", "midterm_remarks"];
  if (gradeVariant === "finals") return [...base, "finals_grade", "finals_equivalent_grade", "finals_remarks"];
  return [...base, "midterm_grade", "midterm_equivalent_grade", "midterm_remarks", "finals_grade", "finals_equivalent_grade", "finals_remarks"];
}

export default function MailPage() {
  const params = useParams();
  const mailId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  const [focusedField, setFocusedField] = useState<"subject" | "body">("body");

  const [mail, setMail] = useState<Mail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadError, setUploadError] = useState<{ error: string; missing?: string[]; unexpected?: string[] } | null>(null);
  const [uploading, setUploading] = useState(false);

  const [emailSubject, setEmailSubject] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [savingCompose, setSavingCompose] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState<string | null>(null);
  const [sendProgress, setSendProgress] = useState<{ sent: number; total: number } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/mails/${mailId}`);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setLoadError(data?.error || `Could not load this mail (HTTP ${res.status}).`);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setMail(data.mail);
    fetch(`/api/subjects/${data.mail.subject_id}`)
      .then((subjectRes) => subjectRes.ok ? subjectRes.json() : null)
      .then((subjectData) => setSubjectName(subjectData?.subject?.name ?? null))
      .catch(() => setSubjectName(null));
    setRecipients(data.recipients);
    setEmailSubject(data.mail.email_subject || "");
    setBodyTemplate(data.mail.body_template || "");
    setLoading(false);
  }, [mailId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/mails/${mailId}/upload`, { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setUploadError(data);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    await load();
  }

  async function handleSaveCompose() {
    setSavingCompose(true);
    setSaveMessage(null);
    const res = await fetch(`/api/mails/${mailId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailSubject, bodyTemplate }),
    });
    setSavingCompose(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSaveMessage({ type: "error", text: data.error || "Could not save this draft." });
      return;
    }
    setSaveMessage({ type: "ok", text: "Draft saved. You can continue editing until sending starts." });
    await load();
  }

  function downloadTemplate() {
    if (!mail) return;
    const headers = expectedColumns(mail.type, mail.grade_variant);
    const example = headers.map((header) => header === "email" ? "student@example.com" : header === "student_number" ? "2023-00123" : header === "first_name" ? "Juan" : header === "last_name" ? "Dela Cruz" : header.includes("grade") ? "90" : header.includes("remarks") ? "Good work" : "Quiz 3");
    const blob = new Blob([[headers.join(","), example.join(",")].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `${mail.type}_${mail.grade_variant || "recipients"}_template.csv`; link.click(); URL.revokeObjectURL(url);
  }

  function insertMergeField(field: string) {
    const input = focusedField === "subject" ? subjectInputRef.current : bodyInputRef.current;
    if (!input) return;
    const token = `{{${field}}}`; const start = input.selectionStart ?? input.value.length; const end = input.selectionEnd ?? start;
    const next = `${input.value.slice(0, start)}${token}${input.value.slice(end)}`;
    if (focusedField === "subject") setEmailSubject(next); else setBodyTemplate(next);
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + token.length, start + token.length); });
  }

  async function handleSend(retryFailed = false) {
    setSending(true);
    setSendMessage(null);
    const target = retryFailed
      ? recipients.filter((r) => r.send_status === "failed").length
      : validRows.length;
    setSendProgress({ sent: 0, total: target });

    try {
      let isStart = true;
      // Loop batches sequentially — each request stays small and fast, so this
      // works fine on Vercel's Hobby plan even for large class lists.
      while (true) {
        const params = new URLSearchParams();
        if (retryFailed) params.set("retryFailed", "true");
        if (isStart) params.set("start", "true");
        const res = await fetch(`/api/mails/${mailId}/send?${params.toString()}`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
          setSendMessage(`Error: ${data.error}`);
          break;
        }
        isStart = false;
        setSendProgress({ sent: Math.max(0, target - data.remaining), total: target });
        if (data.done) {
          setSendMessage(`Sent ${data.totalSent}, failed ${data.totalFailed}.`);
          break;
        }
      }
    } finally {
      setSending(false);
      setSendProgress(null);
      await load();
    }
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>;
  if (!mail) return <p className="text-rust">{loadError || "Mail not found."}</p>;

  const errorRows = recipients.filter((r) => r.row_status === "error");
  const validRows = recipients.filter((r) => r.row_status === "valid");
  const failedSends = recipients.filter((r) => r.send_status === "failed");
  const columns = expectedColumns(mail.type, mail.grade_variant);
  const isSending = mail.status === "sending";
  const isSentOrSending = mail.status === "sent" || mail.status === "sending";
  const canSend = mail.total_rows > 0 && errorRows.length === 0 && !isSentOrSending;
  const validationPassed = mail.total_rows > 0 && errorRows.length === 0;
  const activeStep = !validationPassed ? 1 : isSentOrSending ? 3 : 2;
  const MailTypeView = mail.type === "announcement" ? AnnouncementMailView : mail.type === "activity" ? ActivityMailView : GradeMailView;

  return (
    <MailTypeView><div className="max-w-6xl">
      <Breadcrumbs items={[{ label: "Subjects", href: "/dashboard" }, { label: subjectName ?? "Loading…", href: `/subjects/${mail.subject_id}` }, { label: mail.title }]} />
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div><p className="mb-2 text-sm font-medium text-brass">{mail.type} email</p><h1 className="text-3xl font-semibold">{mail.title}</h1></div>
        <StatusPill status={mail.status} />
      </div>
      <Stepper active={activeStep} steps={["Recipients", "Compose", "Send"]} />

      {/* Step 1: CSV upload */}
      <section className="panel p-5 sm:p-6 mb-6">
        <div className="mb-5 flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brass text-sm font-bold text-white">1</span><div><h2 className="font-semibold">Upload recipients</h2><p className="mt-1 text-sm text-ink-soft">Add a CSV and review each row before composing.</p></div></div>
        <div className="mb-4 flex flex-wrap items-center gap-3"><p className="text-xs text-ink-soft">
          Required columns for this mail type: <code className="text-brass-deep">{columns.join(", ")}</code>
        </p>{mail.type !== "announcement" && <Button type="button" variant="secondary" className="px-3 py-2 text-xs" onClick={downloadTemplate}>Download CSV template</Button>}</div>

        {isSentOrSending ? (
          <p className="text-sm text-ink-soft">
            {mail.csv_filename} — {mail.total_rows} recipients (locked, mail already sent)
          </p>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleUpload}
              disabled={uploading}
              className="block w-full rounded-lg border border-dashed border-rule bg-paper p-4 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[#eef2ff] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brass-deep hover:border-brass"
            />
            {mail.csv_filename && (
              <p className="text-xs text-ink-soft mt-2">
                Current file: {mail.csv_filename} ({mail.total_rows} rows)
              </p>
            )}
          </>
        )}

        {uploadError && (
          <div className="mt-4 rounded-lg border border-rust bg-rust-soft p-3 text-sm">
            <p className="font-medium text-rust">{uploadError.error}</p>
            {uploadError.missing && uploadError.missing.length > 0 && (
              <p className="mt-1">Missing columns: {uploadError.missing.join(", ")}</p>
            )}
            {uploadError.unexpected && uploadError.unexpected.length > 0 && (
              <p className="mt-1">Unexpected columns: {uploadError.unexpected.join(", ")}</p>
            )}
          </div>
        )}

        {recipients.length > 0 && (
          <div className="mt-5">
            <p className="text-sm mb-2">
              <span className="text-pine-deep font-medium">{validRows.length} valid</span>
              {errorRows.length > 0 && (
                <span className="text-rust font-medium">
                  {" "}
                  · {errorRows.length} flagged — fix the CSV and re-upload
                </span>
              )}
            </p>
            <div className="max-h-72 overflow-auto rounded-lg border border-rule-soft p-1">
              <table className="ledger text-xs">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    {mail.type === "activity" && <th>Activity</th>}
                    {mail.type === "grade" && mail.grade_variant !== "finals" && <th>Midterm</th>}
                    {mail.type === "grade" && mail.grade_variant !== "finals" && <th>Midterm equivalent</th>}
                    {mail.type === "grade" && mail.grade_variant !== "finals" && <th>Midterm remarks</th>}
                    {mail.type === "grade" && mail.grade_variant !== "midterm" && <th>Finals</th>}
                    {mail.type === "grade" && mail.grade_variant !== "midterm" && <th>Finals equivalent</th>}
                    {mail.type === "grade" && mail.grade_variant !== "midterm" && <th>Finals remarks</th>}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((r) => (
                    <tr key={r.id} className={r.row_status === "error" ? "bg-rust-soft" : ""}>
                      <td>{r.row_number}</td>
                      <td>
                        {r.first_name} {r.last_name}
                      </td>
                      <td>{r.email || "—"}</td>
                      {mail.type === "activity" && <td>{r.activity || "—"}</td>}
                      {mail.type === "grade" && mail.grade_variant !== "finals" && (
                        <td>{r.midterm_grade || "—"}</td>
                      )}
                      {mail.type === "grade" && mail.grade_variant !== "finals" && <td>{r.midterm_equivalent_grade || "Not provided"}</td>}
                      {mail.type === "grade" && mail.grade_variant !== "finals" && <td>{r.midterm_remarks || "Not provided"}</td>}
                      {mail.type === "grade" && mail.grade_variant !== "midterm" && (
                        <td>{r.finals_grade || "—"}</td>
                      )}
                      {mail.type === "grade" && mail.grade_variant !== "midterm" && <td>{r.finals_equivalent_grade || "Not provided"}</td>}
                      {mail.type === "grade" && mail.grade_variant !== "midterm" && <td>{r.finals_remarks || "Not provided"}</td>}
                      <td>
                        {r.row_status === "error" ? (
                          <span className="text-rust">{r.error_reason}</span>
                        ) : mail.status === "sent" || mail.status === "sending" ? (
                          <StatusPill status={r.send_status} />
                        ) : (
                          <span className="text-pine-deep">valid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Step 2: Compose */}
      <section className={`panel p-5 sm:p-6 mb-6 transition ${validationPassed ? "" : "opacity-60"}`}>
        <div className="mb-5 flex items-start gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${validationPassed ? "bg-brass text-white" : "bg-[#eaecf0] text-ink-soft"}`}>2</span><div><h2 className="font-semibold">Compose your email</h2><p className="mt-1 text-sm text-ink-soft">{validationPassed ? "Use merge fields to personalize each message." : "Available after the recipient list has no flagged rows."}</p></div></div>
        {mail.type !== "announcement" && <div className="mb-4"><p className="mb-2 text-xs font-medium text-ink-soft">Insert a merge field</p><div className="flex flex-wrap gap-2">{columns.map((field) => <button type="button" key={field} onClick={() => insertMergeField(field)} disabled={isSending || !validationPassed} className="rounded-full border border-brass/25 bg-[#eef2ff] px-2.5 py-1 text-xs font-medium text-brass-deep hover:bg-[#e0e7ff] disabled:opacity-50">{`{{${field}}}`}</button>)}</div></div>}
        <div className="space-y-4">
          <Field label="Email subject line">
            <Input
              ref={subjectInputRef}
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              onFocus={() => setFocusedField("subject")}
              disabled={isSending || !validationPassed}
              placeholder="e.g. Grades for {{first_name}} — Midterm"
            />
          </Field>
          <Field label="Email body">
            <Textarea
              ref={bodyInputRef}
              rows={8}
              value={bodyTemplate}
              onChange={(e) => setBodyTemplate(e.target.value)}
              onFocus={() => setFocusedField("body")}
              disabled={isSending || !validationPassed}
              placeholder={`Hi {{first_name}},\n\nYour midterm grade is {{midterm_grade}}.\n\nRegards,\nProf.`}
            />
          </Field>
          {!isSending && validationPassed && (
            <Button variant="secondary" onClick={handleSaveCompose} disabled={savingCompose}>
              {savingCompose ? "Saving…" : "Save draft"}
            </Button>
          )}
          {saveMessage && <p className={`text-sm ${saveMessage.type === "ok" ? "text-pine-deep" : "text-rust"}`}>{saveMessage.text}</p>}
        </div>

        {validRows[0] && (
          <div className="mt-5 border-t border-rule-soft pt-4">
            <p className="text-xs font-medium text-ink-soft mb-2">Preview (first valid row)</p>
            <div className="rounded-lg border border-rule-soft bg-paper p-4 text-sm">
              <p className="font-medium mb-1">{renderPreview(emailSubject, validRows[0])}</p>
              <p className="whitespace-pre-wrap text-ink-soft">
                {renderPreview(bodyTemplate, validRows[0])}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Step 3: Send */}
      <section className={`panel p-5 sm:p-6 transition ${validationPassed ? "" : "opacity-60"}`}>
        <div className="mb-5 flex items-start gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${validationPassed ? "bg-brass text-white" : "bg-[#eaecf0] text-ink-soft"}`}>3</span><div><h2 className="font-semibold">Review and send</h2><p className="mt-1 text-sm text-ink-soft">Messages are delivered one recipient at a time.</p></div></div>
        {!canSend && !isSentOrSending && (
          <p className="text-sm text-ink-soft mb-4">
            Upload a CSV with zero flagged rows, and fill in subject + body, before sending.
          </p>
        )}
        {mail.status === "sent" && (
          <p className="text-sm text-ink-soft mb-4">
            Sent {mail.sent_count} of {mail.total_rows} on this mail.
            {failedSends.length > 0 && ` ${failedSends.length} failed.`}
          </p>
        )}
        <div className="flex gap-3">
          {!isSentOrSending && !sending && (
            <Button onClick={() => handleSend(false)} disabled={!canSend}>
              Send to {validRows.length} recipients
            </Button>
          )}
          {mail.status === "sent" && failedSends.length > 0 && !sending && (
            <Button variant="secondary" onClick={() => handleSend(true)}>
              Retry {failedSends.length} failed
            </Button>
          )}
        </div>

        {sending && sendProgress && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-ink-soft mb-1.5">
              <span>Sending…</span>
              <span>
                {sendProgress.sent} / {sendProgress.total}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-rule-soft">
              <div
                className="h-2 rounded-full bg-brass transition-all duration-300"
                style={{
                  width: `${sendProgress.total > 0 ? (sendProgress.sent / sendProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-ink-soft mt-2">
              Keep this tab open until sending finishes.
            </p>
          </div>
        )}

        {sendMessage && <p className="text-sm mt-3">{sendMessage}</p>}
      </section>
    </div></MailTypeView>
  );
}

function renderPreview(template: string, row: Recipient): string {
  return (template || "").replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = (row as any)[key];
    return value != null ? String(value) : `{{${key}}}`;
  });
}
