CREATE TABLE IF NOT EXISTS attendance_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  public_token VARCHAR(100) NOT NULL UNIQUE,
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS attendance_roster (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  student_number VARCHAR(100) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  UNIQUE KEY uniq_attendance_student (session_id, student_number),
  FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS attendance_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  roster_id INT NOT NULL,
  sign_in_at TIMESTAMP NULL,
  sign_out_at TIMESTAMP NULL,
  UNIQUE KEY uniq_attendance_record (session_id, roster_id),
  FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (roster_id) REFERENCES attendance_roster(id) ON DELETE CASCADE
);
