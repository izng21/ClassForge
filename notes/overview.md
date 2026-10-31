---
project: classforge
status: active
tags: [overview, classforge]
---

# ClassForge

Web app for a single professor to manage class communication and attendance
across multiple subjects. Started as "Class Emailer"; renamed ClassForge when
QR attendance was added.

## Scope

- One professor, multiple subjects/classes. Not department- or campus-wide.
- Basic security only (data integrity), not heavy-duty.
- Not used daily, so free-tier email limits (~300/day) are acceptable.

## Stack

- Framework: TODO (e.g. Next.js / TypeScript / Tailwind)
- Database: MySQL (local dev via XAMPP on Windows)
- Email: professor's own Gmail via custom SMTP (App Password), no third-party provider
- Deploy target: Vercel
- Dev environment: Windows

## Core concepts

- **Subject**: the unit everything hangs off (e.g. a course). Each subject page
  has the emailer on the left and attendance on the right.
- Recipients come only from **CSV import**. There is no manual student management.

## Feature 1: Mail (emailer)

Three mail types per subject, each with its own dedicated page:

- **Announcement**
- **Activity**: CSV columns `student_number, first_name, last_name, activity, email`
- **Grades**: three variants picked at creation: midterm only, finals only, or
  combined. CSV also includes `grade`, `equivalent_grade`, `remarks`. The combined
  variant has two full separate sets of those fields (midterm and finals).

Rules and behavior:

- CSV columns are fixed per mail type; the user does not map them.
- Upload shows a preview and flags invalid rows. To fix them, the professor
  re-uploads a corrected CSV (no inline row editing).
- Activity and grade pages offer a CSV template download and clickable merge-field chips.
- Emails are styled HTML: purple gradient header banner, data table for grades,
  footer bar with the sender name.
- Draft composition remains editable until a send run is actively in progress;
  SMTP settings are verified before a campaign enters the sending state.
- The composed body is the single source of email copy, including greetings and
  activity details, so the in-app preview matches the delivered email.

## Feature 2: QR attendance

1. Professor uploads a CSV (`student_number, first_name, last_name`).
2. App generates a public link.
3. Students open the link and enter student number, first name, and last name to get their QR code.
4. Professor view has sign-in and sign-out scanner buttons (camera QR scanner)
   and a live attendance tracker. Each detected QR pauses the camera while the
   attendance record is verified, then shows a success or error confirmation
   before automatically resuming. A manual fallback validates the student
   number, first name, and last name against the session roster before recording
   the same sign-in or sign-out action.
5. Live tracker and PDF report: students sorted alphabetically by last name
   (then first name and student number), with sign-in and sign-out times.
   The report uses a paginated landscape table with labelled columns and attendance totals.

Status: TODO (what's built vs. in progress)

## UI direction

Modern SaaS look: sidebar nav, breadcrumbs, stepper flow. This replaces the
original ledger/registrar aesthetic.

## Run locally

TODO: install, env vars (names only, never values), DB setup, dev command

## Project structure

TODO: key folders (e.g. app routes, db schema, email templates)

## Conventions and gotchas

- Never commit secrets (SMTP app password, DB credentials). Keep them in `.env.local`.
- TODO: naming, lint/format rules, anything an agent keeps getting wrong

## Open questions

- TODO
