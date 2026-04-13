import { describe, expect, test } from "bun:test";
import {
  getAllUnfurlDomains,
  getConnectorForDomain,
  isUnfurlableDomain,
} from "../domain-registry";

describe("domain-registry", () => {
  test("resolves known domains to connector types", () => {
    expect(getConnectorForDomain("notion.so")).toBe("NOTION");
    expect(getConnectorForDomain("linear.app")).toBe("LINEAR");
    expect(getConnectorForDomain("github.com")).toBe("GITHUB");
    expect(getConnectorForDomain("docs.google.com")).toBe("GOOGLE_DRIVE");
    expect(getConnectorForDomain("figma.com")).toBe("FIGMA");
  });

  test("returns null for unknown domains", () => {
    expect(getConnectorForDomain("example.com")).toBeNull();
    expect(getConnectorForDomain("random.io")).toBeNull();
  });

  test("isUnfurlableDomain returns true for known domains", () => {
    expect(isUnfurlableDomain("notion.so")).toBe(true);
    expect(isUnfurlableDomain("github.com")).toBe(true);
  });

  test("isUnfurlableDomain returns false for unknown domains", () => {
    expect(isUnfurlableDomain("example.com")).toBe(false);
  });

  test("getAllUnfurlDomains returns non-empty array", () => {
    const domains = getAllUnfurlDomains();
    expect(domains.length).toBeGreaterThan(15);
    expect(domains).toContain("notion.so");
    expect(domains).toContain("github.com");
  });
});
