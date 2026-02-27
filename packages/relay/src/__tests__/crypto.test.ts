import { describe, expect, it } from "bun:test";
import {
  decrypt,
  deriveSharedKey,
  encrypt,
  exportPublicKey,
  generateKeyPair,
  importPublicKey,
} from "../crypto";

describe("crypto", () => {
  describe("generateKeyPair", () => {
    it("generates a valid keypair", () => {
      const keypair = generateKeyPair();
      expect(keypair.secretKey).toBeDefined();
      expect(keypair.publicKey).toBeDefined();
    });
  });

  describe("exportPublicKey / importPublicKey", () => {
    it("roundtrips public key through base64", () => {
      const keypair = generateKeyPair();
      const exported = exportPublicKey(keypair.publicKey);

      expect(typeof exported).toBe("string");
      expect(exported.length).toBeGreaterThan(0);

      const imported = importPublicKey(exported);
      expect(imported).toBeDefined();

      const reExported = exportPublicKey(imported);
      expect(reExported).toBe(exported);
    });
  });

  describe("deriveSharedKey", () => {
    it("derives the same key on both sides", () => {
      const daemonKeyPair = generateKeyPair();
      const clientKeyPair = generateKeyPair();

      const daemonPubKeyB64 = exportPublicKey(daemonKeyPair.publicKey);
      const clientPubKeyB64 = exportPublicKey(clientKeyPair.publicKey);

      const daemonSeesClientPubKey = importPublicKey(clientPubKeyB64);
      const clientSeesDaemonPubKey = importPublicKey(daemonPubKeyB64);

      const daemonSharedKey = deriveSharedKey(
        daemonKeyPair.secretKey,
        daemonSeesClientPubKey
      );
      const clientSharedKey = deriveSharedKey(
        clientKeyPair.secretKey,
        clientSeesDaemonPubKey
      );

      const testMessage = "Hello, encrypted world!";
      const encrypted = encrypt(daemonSharedKey, testMessage);
      const decrypted = decrypt(clientSharedKey, encrypted);

      expect(decrypted).toBe(testMessage);
    });
  });

  describe("encrypt / decrypt", () => {
    it("roundtrips a string message", () => {
      const daemonKeyPair = generateKeyPair();
      const clientKeyPair = generateKeyPair();
      const sharedKey = deriveSharedKey(
        daemonKeyPair.secretKey,
        clientKeyPair.publicKey
      );

      const plaintext = "Test message with unicode: \u4f60\u597d\u4e16\u754c";
      const ciphertext = encrypt(sharedKey, plaintext);

      expect(ciphertext).toBeInstanceOf(ArrayBuffer);
      expect(ciphertext.byteLength).toBeGreaterThan(plaintext.length);

      const decrypted = decrypt(sharedKey, ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    it("roundtrips binary data", () => {
      const daemonKeyPair = generateKeyPair();
      const clientKeyPair = generateKeyPair();
      const sharedKey = deriveSharedKey(
        daemonKeyPair.secretKey,
        clientKeyPair.publicKey
      );

      const binary = new Uint8Array([0, 1, 2, 255, 254, 253]);
      const ciphertext = encrypt(sharedKey, binary.buffer);

      const decrypted = decrypt(sharedKey, ciphertext);
      expect(new Uint8Array(decrypted as ArrayBuffer)).toEqual(binary);
    });

    it("fails to decrypt with wrong key", () => {
      const keypair1 = generateKeyPair();
      const keypair2 = generateKeyPair();
      const keypair3 = generateKeyPair();

      const correctKey = deriveSharedKey(
        keypair1.secretKey,
        keypair2.publicKey
      );
      const wrongKey = deriveSharedKey(keypair1.secretKey, keypair3.publicKey);

      const ciphertext = encrypt(correctKey, "secret");

      expect(() => decrypt(wrongKey, ciphertext)).toThrow();
    });

    it("produces different ciphertext for same plaintext (random nonce)", () => {
      const keypair1 = generateKeyPair();
      const keypair2 = generateKeyPair();
      const sharedKey = deriveSharedKey(keypair1.secretKey, keypair2.publicKey);

      const plaintext = "Same message";
      const ciphertext1 = encrypt(sharedKey, plaintext);
      const ciphertext2 = encrypt(sharedKey, plaintext);

      const arr1 = new Uint8Array(ciphertext1);
      const arr2 = new Uint8Array(ciphertext2);
      expect(arr1).not.toEqual(arr2);

      expect(decrypt(sharedKey, ciphertext1)).toBe(plaintext);
      expect(decrypt(sharedKey, ciphertext2)).toBe(plaintext);
    });
  });

  describe("full handshake simulation", () => {
    it("simulates complete daemon<->client key exchange", () => {
      const daemonKeyPair = generateKeyPair();
      const daemonPubKeyB64 = exportPublicKey(daemonKeyPair.publicKey);

      const clientKeyPair = generateKeyPair();
      const clientPubKeyB64 = exportPublicKey(clientKeyPair.publicKey);

      const daemonPubKeyOnClient = importPublicKey(daemonPubKeyB64);

      const clientSharedKey = deriveSharedKey(
        clientKeyPair.secretKey,
        daemonPubKeyOnClient
      );

      const clientPubKeyOnDaemon = importPublicKey(clientPubKeyB64);

      const daemonSharedKey = deriveSharedKey(
        daemonKeyPair.secretKey,
        clientPubKeyOnDaemon
      );

      const testFromDaemon = "Message from daemon";
      const testFromClient = "Message from client";

      const encryptedFromDaemon = encrypt(daemonSharedKey, testFromDaemon);
      expect(decrypt(clientSharedKey, encryptedFromDaemon)).toBe(
        testFromDaemon
      );

      const encryptedFromClient = encrypt(clientSharedKey, testFromClient);
      expect(decrypt(daemonSharedKey, encryptedFromClient)).toBe(
        testFromClient
      );
    });
  });
});
