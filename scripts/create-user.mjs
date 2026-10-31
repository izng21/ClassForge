// One-time setup: creates the professor's login account.
// Usage: node scripts/create-user.mjs professor@example.com "a strong password" "Prof. Name"
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import "dotenv/config";

const [, , email, password, displayName] = process.argv;

if (!email || !password || !displayName) {
  console.error('Usage: node scripts/create-user.mjs <email> <password> "<display name>"');
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "class_emailer",
});

const hash = await bcrypt.hash(password, 10);

try {
  await pool.execute(
    `INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), display_name = VALUES(display_name)`,
    [email, hash, displayName]
  );
  console.log(`User ready: ${email}`);
} catch (err) {
  console.error("Failed to create user:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
