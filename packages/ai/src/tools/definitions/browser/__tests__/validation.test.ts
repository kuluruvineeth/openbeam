import { afterEach, describe, expect, it } from "bun:test";
import {
  checkNavigationRateLimit,
  clampTimeout,
  resetRateLimit,
  validateUrl,
} from "../validation";

describe("validateUrl", () => {
  it("accepts valid HTTP URLs", () => {
    const result = validateUrl("https://example.com");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.parsed.href).toBe("https://example.com/");
    }
  });

  it("accepts valid HTTP URL with path", () => {
    const result = validateUrl("https://example.com/path?q=1");
    expect(result.valid).toBe(true);
  });

  it("rejects empty URL", () => {
    const result = validateUrl("");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("URL is required");
    }
  });

  it("rejects invalid URL format", () => {
    const result = validateUrl("not a url");
    expect(result.valid).toBe(false);
  });

  it("rejects file:// protocol", () => {
    const result = validateUrl("file:///etc/passwd");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("file:");
    }
  });

  it("rejects javascript: protocol", () => {
    const result = validateUrl("javascript:alert(1)");
    expect(result.valid).toBe(false);
  });

  it("rejects data: protocol", () => {
    const result = validateUrl("data:text/html,<h1>test</h1>");
    expect(result.valid).toBe(false);
  });

  it("blocks 10.x.x.x private network by default", () => {
    const result = validateUrl("http://10.0.0.1/admin");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("internal network");
    }
  });

  it("blocks 172.16.x.x private network by default", () => {
    const result = validateUrl("http://172.16.0.1");
    expect(result.valid).toBe(false);
  });

  it("blocks 192.168.x.x private network by default", () => {
    const result = validateUrl("http://192.168.1.1");
    expect(result.valid).toBe(false);
  });

  it("blocks 127.0.0.1 localhost by default", () => {
    const result = validateUrl("http://127.0.0.1:3000");
    expect(result.valid).toBe(false);
  });

  it("blocks localhost by default", () => {
    const result = validateUrl("http://localhost:8080");
    expect(result.valid).toBe(false);
  });

  it("allows internal addresses when allowInternal is true", () => {
    const result = validateUrl("http://10.0.0.1/admin", true);
    expect(result.valid).toBe(true);
  });

  it("allows localhost when allowInternal is true", () => {
    const result = validateUrl("http://localhost:3000", true);
    expect(result.valid).toBe(true);
  });

  it("does not block 172.15.x.x (not in private range)", () => {
    const result = validateUrl("http://172.15.0.1");
    expect(result.valid).toBe(true);
  });

  it("does not block 172.32.x.x (not in private range)", () => {
    const result = validateUrl("http://172.32.0.1");
    expect(result.valid).toBe(true);
  });
});

describe("checkNavigationRateLimit", () => {
  afterEach(() => {
    resetRateLimit();
  });

  it("allows navigation within rate limit", () => {
    const result = checkNavigationRateLimit();
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(29);
  });

  it("tracks remaining navigations", () => {
    checkNavigationRateLimit();
    checkNavigationRateLimit();
    const result = checkNavigationRateLimit();
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(27);
  });

  it("blocks after 30 navigations", () => {
    for (let i = 0; i < 30; i++) {
      checkNavigationRateLimit();
    }
    const result = checkNavigationRateLimit();
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe("clampTimeout", () => {
  it("returns default when undefined", () => {
    expect(clampTimeout(undefined)).toBe(30_000);
  });

  it("returns custom default when specified", () => {
    expect(clampTimeout(undefined, 10_000)).toBe(10_000);
  });

  it("clamps to minimum of 1000ms", () => {
    expect(clampTimeout(500)).toBe(1000);
  });

  it("clamps to maximum of 120000ms", () => {
    expect(clampTimeout(200_000)).toBe(120_000);
  });

  it("passes through valid values", () => {
    expect(clampTimeout(15_000)).toBe(15_000);
  });

  it("floors fractional values", () => {
    expect(clampTimeout(5000.7)).toBe(5000);
  });
});
