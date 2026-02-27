/// <reference lib="dom" />

import { fromByteArray, toByteArray } from "base64-js";
import nacl from "tweetnacl";

export type KeyPair = {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
};

export type SharedKey = Uint8Array;

const NONCE_LENGTH = nacl.box.nonceLength;

let prngReady = false;

function ensurePrng(): void {
  if (prngReady) {
    return;
  }

  try {
    nacl.randomBytes(1);
    prngReady = true;
    return;
  } catch {
    // fallthrough
  }

  const cryptoObj = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (cryptoObj?.getRandomValues) {
    nacl.setPRNG((x, n) => {
      cryptoObj.getRandomValues(x.subarray(0, n));
    });
    prngReady = true;
    return;
  }

  throw new Error(
    "No secure PRNG available for tweetnacl (missing crypto.getRandomValues)"
  );
}

function encodeBase64(bytes: Uint8Array): string {
  return fromByteArray(bytes);
}

function decodeBase64(base64: string): Uint8Array {
  return toByteArray(base64);
}

function toUint8(data: string | ArrayBuffer): Uint8Array {
  return typeof data === "string"
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return out.buffer as ArrayBuffer;
}

export function generateKeyPair(): KeyPair {
  ensurePrng();
  const { publicKey, secretKey } = nacl.box.keyPair();
  return { publicKey, secretKey };
}

export function exportPublicKey(publicKey: Uint8Array): string {
  if (
    !(publicKey instanceof Uint8Array) ||
    publicKey.byteLength !== nacl.box.publicKeyLength
  ) {
    throw new Error(
      `Invalid public key length (expected ${nacl.box.publicKeyLength})`
    );
  }
  return encodeBase64(publicKey);
}

export function importPublicKey(base64: string): Uint8Array {
  const bytes = decodeBase64(base64);
  if (bytes.byteLength !== nacl.box.publicKeyLength) {
    throw new Error(
      `Invalid public key length (expected ${nacl.box.publicKeyLength})`
    );
  }
  return bytes;
}

export function exportSecretKey(secretKey: Uint8Array): string {
  if (
    !(secretKey instanceof Uint8Array) ||
    secretKey.byteLength !== nacl.box.secretKeyLength
  ) {
    throw new Error(
      `Invalid secret key length (expected ${nacl.box.secretKeyLength})`
    );
  }
  return encodeBase64(secretKey);
}

export function importSecretKey(base64: string): Uint8Array {
  const bytes = decodeBase64(base64);
  if (bytes.byteLength !== nacl.box.secretKeyLength) {
    throw new Error(
      `Invalid secret key length (expected ${nacl.box.secretKeyLength})`
    );
  }
  return bytes;
}

export function deriveSharedKey(
  ourSecretKey: Uint8Array,
  peerPublicKey: Uint8Array
): SharedKey {
  if (ourSecretKey.byteLength !== nacl.box.secretKeyLength) {
    throw new Error(
      `Invalid secret key length (expected ${nacl.box.secretKeyLength})`
    );
  }
  if (peerPublicKey.byteLength !== nacl.box.publicKeyLength) {
    throw new Error(
      `Invalid peer public key length (expected ${nacl.box.publicKeyLength})`
    );
  }
  return nacl.box.before(peerPublicKey, ourSecretKey);
}

export function encrypt(
  sharedKey: SharedKey,
  data: string | ArrayBuffer
): ArrayBuffer {
  ensurePrng();
  const nonce = nacl.randomBytes(NONCE_LENGTH);
  const plaintext = toUint8(data);
  const ciphertext = nacl.box.after(plaintext, nonce, sharedKey);
  const out = new Uint8Array(nonce.byteLength + ciphertext.byteLength);
  out.set(nonce, 0);
  out.set(ciphertext, nonce.byteLength);
  return toArrayBuffer(out);
}

export function decrypt(
  sharedKey: SharedKey,
  data: ArrayBuffer
): string | ArrayBuffer {
  const bytes = new Uint8Array(data);
  if (bytes.byteLength < NONCE_LENGTH) {
    throw new Error("Ciphertext bundle too short");
  }

  const nonce = bytes.slice(0, NONCE_LENGTH);
  const ciphertext = bytes.slice(NONCE_LENGTH);
  const opened = nacl.box.open.after(ciphertext, nonce, sharedKey);
  if (!opened) {
    throw new Error("Decryption failed");
  }

  const plaintext = toArrayBuffer(opened);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
  } catch {
    return plaintext;
  }
}
