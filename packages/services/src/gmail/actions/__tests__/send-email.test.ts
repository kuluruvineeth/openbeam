import { describe, expect, it } from "bun:test";

const CRLF_CHARS = /[\r\n]/g;

function sanitizeEmailHeader(value: string): string {
  return value.replace(CRLF_CHARS, "");
}

function sanitizeEmailAddresses(addresses: string[]): string[] {
  return addresses.map(sanitizeEmailHeader);
}

describe("Email Header Injection Prevention", () => {
  describe("sanitizeEmailHeader", () => {
    it("removes newline characters", () => {
      const malicious = "attacker@evil.com\nBcc: victim@target.com";
      expect(sanitizeEmailHeader(malicious)).toBe(
        "attacker@evil.comBcc: victim@target.com"
      );
    });

    it("removes carriage return characters", () => {
      const malicious = "attacker@evil.com\rBcc: victim@target.com";
      expect(sanitizeEmailHeader(malicious)).toBe(
        "attacker@evil.comBcc: victim@target.com"
      );
    });

    it("removes CRLF sequences", () => {
      const malicious = "attacker@evil.com\r\nBcc: victim@target.com";
      expect(sanitizeEmailHeader(malicious)).toBe(
        "attacker@evil.comBcc: victim@target.com"
      );
    });

    it("handles multiple injection attempts", () => {
      const malicious =
        "test@example.com\nBcc: hidden1@target.com\r\nCc: hidden2@target.com";
      expect(sanitizeEmailHeader(malicious)).toBe(
        "test@example.comBcc: hidden1@target.comCc: hidden2@target.com"
      );
    });

    it("preserves safe email addresses", () => {
      const safe = "user@example.com";
      expect(sanitizeEmailHeader(safe)).toBe("user@example.com");
    });

    it("handles empty string", () => {
      expect(sanitizeEmailHeader("")).toBe("");
    });
  });

  describe("sanitizeEmailAddresses", () => {
    it("sanitizes all addresses in array", () => {
      const addresses = [
        "safe@example.com",
        "malicious@evil.com\nBcc: victim@target.com",
        "another@safe.com",
      ];
      const sanitized = sanitizeEmailAddresses(addresses);

      expect(sanitized).toEqual([
        "safe@example.com",
        "malicious@evil.comBcc: victim@target.com",
        "another@safe.com",
      ]);
    });

    it("handles empty array", () => {
      expect(sanitizeEmailAddresses([])).toEqual([]);
    });
  });

  describe("Subject header injection", () => {
    it("prevents header injection via subject", () => {
      const maliciousSubject = "Hello\r\nBcc: secret@victim.com";
      expect(sanitizeEmailHeader(maliciousSubject)).toBe(
        "HelloBcc: secret@victim.com"
      );
    });
  });
});
