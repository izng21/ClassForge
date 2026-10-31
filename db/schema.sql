-- ClassForge schema
-- Single-professor app: one admin user, subjects each own announcement/activity/grade mails.

CREATE DATABASE IF NOT EXISTS class_emailer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE class_emailer;

-- Single professor account (app supports one login; table kept simple)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMTP settings, one row per user (in practice just one row total)
CREATE TABLE IF NOT EXISTS smtp_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  host VARCHAR(255) NOT NULL DEFAULT 'smtp.gmail.com',
  port INT NOT NULL DEFAULT 587,
  encryption ENUM('tls', 'ssl', 'none') NOT NULL DEFAULT 'tls',
  username VARCHAR(255) NOT NULL,
  -- App password is encrypted at rest with AES-256-GCM using APP_SECRET (see src/lib/crypto.ts).
  encrypted_password TEXT NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_user_smtp (user_id)
);

CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mails (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  type ENUM('announcement', 'activity', 'grade') NOT NULL,
  grade_variant ENUM('midterm', 'finals', 'midterm_finals') NULL,
  title VARCHAR(255) NOT NULL,
  email_subject VARCHAR(500) NOT NULL DEFAULT '',
  body_template TEXT NOT NULL DEFAULT '',
  csv_filename VARCHAR(255) NULL,
  status ENUM('draft', 'validated', 'sending', 'sent', 'failed') NOT NULL DEFAULT 'draft',
  total_rows INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mail_recipients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mail_id INT NOT NULL,
  row_number INT NOT NULL,
  student_number VARCHAR(100) NULL,
  first_name VARCHAR(255) NULL,
  last_name VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  activity VARCHAR(255) NULL,
  midterm_grade VARCHAR(20) NULL,
  midterm_equivalent_grade VARCHAR(50) NULL,
  midterm_remarks TEXT NULL,
  finals_grade VARCHAR(20) NULL,
  finals_equivalent_grade VARCHAR(50) NULL,
  finals_remarks TEXT NULL,
  row_status ENUM('valid', 'error') NOT NULL DEFAULT 'valid',
  error_reason VARCHAR(500) NULL,
  send_status ENUM('pending', 'sent', 'failed', 'excluded') NOT NULL DEFAULT 'pending',
  send_error VARCHAR(500) NULL,
  sent_at TIMESTAMP NULL,
  FOREIGN KEY (mail_id) REFERENCES mails(id) ON DELETE CASCADE
);

CREATE INDEX idx_mails_subject ON mails(subject_id);
CREATE INDEX idx_recipients_mail ON mail_recipients(mail_id);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY, subject_id INT NOT NULL, name VARCHAR(255) NOT NULL,
  public_token VARCHAR(100) NOT NULL UNIQUE, status ENUM('open','closed') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS attendance_roster (
  id INT AUTO_INCREMENT PRIMARY KEY, session_id INT NOT NULL, student_number VARCHAR(100) NOT NULL,
  first_name VARCHAR(255) NOT NULL, last_name VARCHAR(255) NOT NULL,
  UNIQUE KEY uniq_attendance_student (session_id, student_number),
  FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS attendance_records (
  id INT AUTO_INCREMENT PRIMARY KEY, session_id INT NOT NULL, roster_id INT NOT NULL,
  sign_in_at TIMESTAMP NULL, sign_out_at TIMESTAMP NULL, UNIQUE KEY uniq_attendance_record (session_id, roster_id),
  FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (roster_id) REFERENCES attendance_roster(id) ON DELETE CASCADE
);
