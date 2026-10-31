import crypto from "crypto";

// APP_SECRET must be a 32-byte value (64 hex chars) set in .env.local.
// Generate one with: openssl rand -hex 32
function getKey(): Buffer {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "APP_SECRET is missing or too short. Set a 32+ byte secret in .env.local (see .env.example)."
    );
  }
  // Derive a stable 32-byte key regardless of the raw secret's exact length/encoding.
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plaintext string (e.g. the SMTP app password) for storage.
 * Output format: iv:authTag:ciphertext, all hex-encoded, so it's safe to store in a single TEXT column.
 */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Malformed encrypted payload.");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}
