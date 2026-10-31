"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button, Field, Input } from "@/components/ui";

type ScanStatus = "starting" | "ready" | "verifying" | "success" | "error";
type ManualForm = { studentNumber: string; firstName: string; lastName: string };

let cameraLifecycle: Promise<void> = Promise.resolve();

export function AttendanceScanner({ sessionId, mode, onClose }: { sessionId: string; mode: "in" | "out"; onClose: () => void }) {
  const [status, setStatus] = useState<ScanStatus>("starting");
  const [message, setMessage] = useState("Opening camera...");
  const [manualEntry, setManualEntry] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualForm, setManualForm] = useState<ManualForm>({ studentNumber: "", firstName: "", lastName: "" });
  const recent = useRef(new Map<string, number>());
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const manualPaused = useRef(false);
  const manualTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function resumeManualScanner() {
    if (manualTimer.current) clearTimeout(manualTimer.current);
    try {
      if (manualPaused.current) scannerRef.current?.resume();
      manualPaused.current = false;
      setManualEntry(false);
      setStatus("ready");
      setMessage("Ready to scan a student QR code.");
    } catch {
      setStatus("error");
      setMessage("The scanner could not resume. Close it and try again.");
    }
  }

  function openManualEntry() {
    try {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.pause(false);
        manualPaused.current = true;
      }
      setManualEntry(true);
      setMessage("Enter the student's roster details to verify attendance.");
    } catch {
      setStatus("error");
      setMessage("The scanner could not pause. Close it and try again.");
    }
  }

  async function submitManualEntry(event: FormEvent) {
    event.preventDefault();
    setManualSubmitting(true);
    setStatus("verifying");
    setMessage("Verifying manual attendance...");
    try {
      const res = await fetch("/api/attendance/" + sessionId + "/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...manualForm, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Could not verify these details.");
        return;
      }
      const student = data.student.first_name + " " + data.student.last_name;
      setStatus("success");
      setMessage("Verified: " + student + " signed " + (mode === "in" ? "in." : "out."));
      setManualForm({ studentNumber: "", firstName: "", lastName: "" });
      navigator.vibrate?.(80);
      manualTimer.current = setTimeout(resumeManualScanner, 1800);
    } catch {
      setStatus("error");
      setMessage("Could not verify manual attendance. Check your connection and try again.");
    } finally {
      setManualSubmitting(false);
    }
  }

  useEffect(() => {
    let disposed = false;
    let processing = false;
    let paused = false;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let scanner: Html5Qrcode | null = null;

    const resumeScanning = () => {
      if (disposed || !scanner || !paused) return;
      try {
        scanner.resume();
        paused = false;
        processing = false;
        setStatus("ready");
        setMessage("Ready to scan the next QR code.");
      } catch {
        if (!disposed) {
          setStatus("error");
          setMessage("The scanner could not resume. Close it and try again.");
        }
      }
    };

    const run = cameraLifecycle.then(async () => {
      if (disposed) return;
      scanner = new Html5Qrcode("attendance-camera");
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 230, height: 230 } },
          async (text) => {
            if (disposed || processing || manualPaused.current || (recent.current.get(text) || 0) > Date.now() - 5000) return;
            processing = true;
            recent.current.set(text, Date.now());
            try {
              scanner?.pause(false);
              paused = true;
            } catch {
              processing = false;
              return;
            }
            setStatus("verifying");
            setMessage("QR detected. Verifying attendance...");
            try {
              const res = await fetch("/api/attendance/" + sessionId + "/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: text, mode }),
              });
              const data = await res.json();
              if (disposed) return;
              if (res.ok) {
                const student = data.student.first_name + " " + data.student.last_name;
                setStatus("success");
                setMessage("Verified: " + student + " signed " + (mode === "in" ? "in." : "out."));
                navigator.vibrate?.(80);
                resumeTimer = setTimeout(resumeScanning, 1800);
              } else {
                setStatus("error");
                setMessage(data.error || "This QR code could not be verified.");
                resumeTimer = setTimeout(resumeScanning, 2400);
              }
            } catch {
              if (!disposed) {
                setStatus("error");
                setMessage("Could not verify this scan. Check your connection and try again.");
                resumeTimer = setTimeout(resumeScanning, 2400);
              }
            }
          },
          () => undefined
        );
        if (!disposed) {
          setStatus("ready");
          setMessage("Ready to scan a student QR code.");
        }
      } catch {
        if (!disposed) {
          setStatus("error");
          setMessage("Camera access was denied or no camera is available.");
        }
      }
    });

    return () => {
      disposed = true;
      if (resumeTimer) clearTimeout(resumeTimer);
      if (manualTimer.current) clearTimeout(manualTimer.current);
      cameraLifecycle = run.then(async () => {
        if (!scanner) return;
        try {
          if (paused || manualPaused.current) scanner.resume();
          if (scanner.isScanning) await scanner.stop();
        } catch {
          // The browser may have already released the camera.
        } finally {
          if (scannerRef.current === scanner) scannerRef.current = null;
        }
      });
    };
  }, [mode, sessionId]);

  const feedbackStyles = status === "success" ? "bg-sage-soft text-pine-deep" : status === "error" ? "bg-rust-soft text-rust" : "bg-paper text-ink-soft";
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"><div className="panel w-full max-w-md p-5"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold">Scan sign-{mode}</h2><p className="mt-1 text-xs text-ink-soft">Point the camera at a student QR code.</p></div><Button variant="secondary" onClick={onClose}>Close</Button></div><div id="attendance-camera" className={manualEntry ? "hidden" : "overflow-hidden rounded-lg"} /><div role="status" aria-live="polite" className={"mt-3 rounded-lg p-3 text-sm font-medium " + feedbackStyles}>{message}</div>{manualEntry ? <form onSubmit={submitManualEntry} className="mt-4 space-y-4"><div><h3 className="font-semibold">Manual entry</h3><p className="mt-1 text-sm text-ink-soft">All details must match the uploaded roster.</p></div><Field label="Student number"><Input required value={manualForm.studentNumber} onChange={(event) => setManualForm({ ...manualForm, studentNumber: event.target.value })} /></Field><Field label="First name"><Input required value={manualForm.firstName} onChange={(event) => setManualForm({ ...manualForm, firstName: event.target.value })} /></Field><Field label="Last name"><Input required value={manualForm.lastName} onChange={(event) => setManualForm({ ...manualForm, lastName: event.target.value })} /></Field><div className="flex gap-3"><Button type="submit" disabled={manualSubmitting}>{manualSubmitting ? "Verifying..." : "Verify and sign " + mode}</Button><Button type="button" variant="ghost" onClick={resumeManualScanner} disabled={manualSubmitting}>Back to scanner</Button></div></form> : <Button type="button" variant="ghost" className="mt-3 w-full" onClick={openManualEntry} disabled={status === "starting" || status === "verifying"}>Enter attendance manually</Button>}</div></div>;
}
