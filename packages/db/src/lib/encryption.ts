import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required for credential encryption"
    );
  }

  if (key.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate with: openssl rand -hex 32"
    );
  }

  return Buffer.from(key, "hex");
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
}

export function encrypt(plaintext: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();
  const ciphertextWithTag = Buffer.concat([
    Buffer.from(encrypted, "base64"),
    authTag,
  ]).toString("base64");

  return {
    ciphertext: ciphertextWithTag,
    iv: iv.toString("base64"),
  };
}

export function decrypt(encryptedData: EncryptedData): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(encryptedData.iv, "base64");

  const ciphertextWithTag = Buffer.from(encryptedData.ciphertext, "base64");
  const authTag = ciphertextWithTag.subarray(-AUTH_TAG_LENGTH);
  const ciphertext = ciphertextWithTag.subarray(0, -AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

export function encryptCredentials(
  credentials: Record<string, unknown>
): EncryptedData {
  return encrypt(JSON.stringify(credentials));
}

export function decryptCredentials(
  encryptedData: EncryptedData
): Record<string, unknown> {
  const json = decrypt(encryptedData);
  return JSON.parse(json);
}

export function isEncryptionConfigured(): boolean {
  return !!process.env.ENCRYPTION_KEY;
}

export function encryptIfConfigured(plaintext: string | null | undefined): {
  encrypted: string | null;
  iv: string | null;
} {
  if (!plaintext) {
    return { encrypted: null, iv: null };
  }

  if (!isEncryptionConfigured()) {
    return { encrypted: plaintext, iv: null };
  }

  const result = encrypt(plaintext);
  return { encrypted: result.ciphertext, iv: result.iv };
}

export function decryptIfEncrypted(
  ciphertext: string | null | undefined,
  iv: string | null | undefined
): string | null {
  if (!ciphertext) {
    return null;
  }

  if (!iv) {
    return ciphertext;
  }

  return decrypt({ ciphertext, iv });
}
