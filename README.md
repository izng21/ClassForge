# ClassForge

## Attendance

Run `db/migrations/002_attendance.sql` on existing databases. Professors create an attendance session from a subject, upload its roster, and project the generated public QR link. Students validate their details to receive a signed QR, which is scanned for sign-in and sign-out. Session reports are available as PDF downloads.

A single-professor web app for sending bulk class emails — announcements, activity notices,
and grade distribution — with recipients coming straight from a CSV upload each time.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind v4)
- MySQL (via `mysql2`, raw SQL — no ORM)
- Nodemailer + Gmail SMTP (App Password), same approach as the LMS project
- Session auth via signed JWT cookie (single professor account, no public signup)

## How it works

1. **Subjects** are your classes (e.g. "Web Development 101").
2. Each subject has **mails** of type Announcement, Activity, or Grade (grade has three
   variants: midterm only, finals only, or midterm + finals).
3. Every mail type expects a **fixed CSV column set** — no column-mapping step:
   - Announcement: `student_number, first_name, last_name, email`
   - Activity: `student_number, first_name, last_name, email, activity`
   - Grade (midterm): `student_number, first_name, last_name, email, midterm_grade`
   - Grade (finals): `student_number, first_name, last_name, email, finals_grade`
   - Grade (midterm + finals): `student_number, first_name, last_name, email, midterm_grade, finals_grade`
4. On upload, every row is validated. If **any** row is flagged (bad email, missing field,
   out-of-range grade), sending is blocked — fix the CSV and re-upload. No inline editing in v1.
5. Compose the subject line and body using `{{placeholder}}` merge fields matching that
   type's columns, preview against a real row, then send. Sends run in a throttled loop
   (~1 email per 0.8s) straight from the professor's Gmail via SMTP — no third-party
   email provider, no queue infrastructure needed at this scale.
6. Every mail keeps a per-recipient log (sent/failed) with a one-click retry for failures.

Sample CSVs for each type are in `samples/`.

## Setup

### 1. Database

```bash
mysql -u root -p < db/schema.sql
```

### 2. Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your MySQL credentials, and generate a secret:

```bash
openssl rand -hex 32
# paste the output as APP_SECRET
```

`APP_SECRET` does double duty: it signs login sessions AND encrypts the Gmail App
Password before it's stored in the database (AES-256-GCM) — so the raw password never
sits in plaintext in MySQL.

### 3. Install dependencies

```bash
npm install
```

### 4. Create your professor login

```bash
node scripts/create-user.mjs you@gmail.com "a-strong-password" "Prof. Your Name"
```

### 5. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`, log in, then go to **SMTP Settings** and enter your Gmail
address + a 16-character [App Password](https://support.google.com/accounts/answer/185833)
(regular Gmail passwords won't work with SMTP). Use "Test connection" to confirm before
sending anything for real.

## Notes on scale

This is built for one professor sending occasional bulk mail across a few classes —
not a mass-mailing platform. A few deliberate simplifications that make sense at this
scale but wouldn't at a larger one:

- **No background job queue — client-driven batching instead.** Each call to the send
  endpoint processes 10 recipients (with a 500ms delay between each) and returns; the
  mail page calls it repeatedly until every recipient is done, showing a progress bar.
  This keeps each request comfortably under 5 seconds, so it works on Vercel's free
  Hobby plan without hitting the 10s serverless function timeout, however large the
  class list gets. The trade-off: the professor needs to keep the tab open while a
  send is in progress. If that ever becomes a problem, a proper background queue
  (e.g. BullMQ) is the next step.
- **No column-mapping UI.** CSV columns are fixed per mail type by design, matching how
  you already export grade sheets — simpler for you, less that can go wrong.
- **Re-upload, not inline-edit, for flagged rows.** Simpler v1; inline correction in the
  preview table is a natural next feature if it becomes a hassle later.
