import { randomBytes } from "node:crypto";
import argon2, { type Options as Argon2Options } from "argon2";

const BASE62_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const KEY_PREFIX = "obc_";
const IDENTIFIER_LENGTH = 8;
const SECRET_LENGTH = 48;
const ARGON2_OPTIONS: Argon2Options = {
  type: argon2.argon2id,
  memoryCost: 64 * 1024,
  timeCost: 3,
  parallelism: 1,
};

function randomBase62(length: number): string {
  let output = "";
  while (output.length < length) {
    const bytes = randomBytes(length);
    for (const byte of bytes) {
      if (output.length >= length) {
        break;
      }
      output += BASE62_ALPHABET[byte % BASE62_ALPHABET.length];
    }
  }
  return output;
}

export async function generateCustomConnectorApiKey(): Promise<{
  key: string;
  hash: string;
  prefix: string;
}> {
  const identifier = randomBase62(IDENTIFIER_LENGTH);
  const secret = randomBase62(SECRET_LENGTH);
  const lookupPrefix = `${KEY_PREFIX}${identifier}`;
  const key = `${lookupPrefix}${secret}`;
  const hash = await argon2.hash(key, ARGON2_OPTIONS);
  return { key, hash, prefix: lookupPrefix };
}

export async function verifyCustomConnectorApiKey(
  candidateKey: string,
  storedHash: string
): Promise<boolean> {
  return await argon2.verify(storedHash, candidateKey);
}

export function extractCustomConnectorKeyPrefix(key: string): string | null {
  if (!key.startsWith(KEY_PREFIX)) {
    return null;
  }
  if (key.length < KEY_PREFIX.length + IDENTIFIER_LENGTH) {
    return null;
  }
  return key.slice(0, KEY_PREFIX.length + IDENTIFIER_LENGTH);
}

export function isCustomConnectorKey(key: string): boolean {
  return key.startsWith(KEY_PREFIX);
}
