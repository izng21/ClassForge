-- Run once for existing ClassForge databases created before per-period grade details.
ALTER TABLE mail_recipients
  ADD COLUMN IF NOT EXISTS midterm_equivalent_grade VARCHAR(50) NULL AFTER midterm_grade,
  ADD COLUMN IF NOT EXISTS midterm_remarks TEXT NULL AFTER midterm_equivalent_grade,
  ADD COLUMN IF NOT EXISTS finals_equivalent_grade VARCHAR(50) NULL AFTER finals_grade,
  ADD COLUMN IF NOT EXISTS finals_remarks TEXT NULL AFTER finals_equivalent_grade;
