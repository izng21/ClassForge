// One-time setup: creates the professor's login account.
// Usage: node --env-file=.env.local scripts/create-user.mjs you@gmail.com "a strong password" "Prof. Name"
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const [, , email, password, displayName] = process.argv;

if (!email || !password || !displayName) {
  console.error(
    'Usage: node scripts/create-user.mjs <email> <password> "<display name>"',
  );
  process.exit(1);
}

const pool = mysql.createPool({
  host:
    process.env.DB_HOST || "gateway01.ap-southeast-1.prod.aws.tidbcloud.com",
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER || "2vzb6LnKCuayGWc.root",
  password: process.env.DB_PASSWORD || "X6i9Xlt17iXtlUBm",
  database: process.env.DB_NAME || "class_emailer",
  // TiDB Cloud only accepts TLS connections. Set DB_SSL=true in .env.local.
  ssl:
    process.env.DB_SSL === "true"
      ? { minVersion: "TLSv1.2", rejectUnauthorized: true }
      : undefined,
});

const hash = await bcrypt.hash(password, 10);

try {
  await pool.execute(
    `INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), display_name = VALUES(display_name)`,
    [email, hash, displayName],
  );
  console.log(`User ready: ${email}`);
} catch (err) {
  console.error("Failed to create user:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
