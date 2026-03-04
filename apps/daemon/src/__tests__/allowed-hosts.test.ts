import { describe, expect, it } from "bun:test";
import {
  isHostAllowed,
  mergeAllowedHosts,
  parseAllowedHostsEnv,
} from "../allowed-hosts";

describe("isHostAllowed", () => {
  it("rejects undefined host header", () => {
    expect(isHostAllowed(undefined, undefined)).toBe(false);
  });

  it("rejects empty host header", () => {
    expect(isHostAllowed("", undefined)).toBe(false);
  });

  it("allows localhost by default", () => {
    expect(isHostAllowed("localhost", undefined)).toBe(true);
    expect(isHostAllowed("localhost:6868", undefined)).toBe(true);
  });

  it("allows localhost subdomains", () => {
    expect(isHostAllowed("app.localhost", undefined)).toBe(true);
    expect(isHostAllowed("app.localhost:3000", undefined)).toBe(true);
  });

  it("allows IP addresses by default", () => {
    expect(isHostAllowed("127.0.0.1", undefined)).toBe(true);
    expect(isHostAllowed("127.0.0.1:6868", undefined)).toBe(true);
    expect(isHostAllowed("192.168.1.1", undefined)).toBe(true);
  });

  it("allows IPv6 bracket notation", () => {
    expect(isHostAllowed("[::1]", undefined)).toBe(true);
    expect(isHostAllowed("[::1]:6868", undefined)).toBe(true);
  });

  it("rejects external hosts by default", () => {
    expect(isHostAllowed("example.com", undefined)).toBe(false);
    expect(isHostAllowed("evil.com:6868", undefined)).toBe(false);
  });

  it("allows everything when config is true", () => {
    expect(isHostAllowed("anything.com", true)).toBe(true);
    expect(isHostAllowed("evil.com", true)).toBe(true);
  });

  it("allows exact matches from config", () => {
    const config = ["myapp.com", "dashboard.io"];
    expect(isHostAllowed("myapp.com", config)).toBe(true);
    expect(isHostAllowed("myapp.com:443", config)).toBe(true);
    expect(isHostAllowed("dashboard.io", config)).toBe(true);
    expect(isHostAllowed("other.com", config)).toBe(false);
  });

  it("allows wildcard subdomain patterns", () => {
    const config = [".myapp.com"];
    expect(isHostAllowed("myapp.com", config)).toBe(true);
    expect(isHostAllowed("sub.myapp.com", config)).toBe(true);
    expect(isHostAllowed("deep.sub.myapp.com", config)).toBe(true);
    expect(isHostAllowed("notmyapp.com", config)).toBe(false);
  });

  it("is case-insensitive", () => {
    const config = ["MyApp.COM"];
    expect(isHostAllowed("myapp.com", config)).toBe(true);
    expect(isHostAllowed("MYAPP.COM", config)).toBe(true);
  });
});

describe("mergeAllowedHosts", () => {
  it("returns empty array for all undefined", () => {
    expect(mergeAllowedHosts([undefined, undefined])).toEqual([]);
  });

  it("returns true if any value is true", () => {
    expect(mergeAllowedHosts([undefined, true, ["foo.com"]])).toBe(true);
    expect(mergeAllowedHosts([true])).toBe(true);
  });

  it("merges arrays and deduplicates", () => {
    const result = mergeAllowedHosts([
      ["foo.com", "bar.com"],
      ["bar.com", "baz.com"],
    ]);
    expect(result).toEqual(["foo.com", "bar.com", "baz.com"]);
  });

  it("filters empty strings", () => {
    const result = mergeAllowedHosts([["", " ", "valid.com"]]);
    expect(result).toEqual(["valid.com"]);
  });

  it("trims whitespace", () => {
    const result = mergeAllowedHosts([["  host.com  "]]);
    expect(result).toEqual(["host.com"]);
  });
});

describe("parseAllowedHostsEnv", () => {
  it("returns undefined for missing value", () => {
    expect(parseAllowedHostsEnv(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(parseAllowedHostsEnv("")).toBeUndefined();
    expect(parseAllowedHostsEnv("  ")).toBeUndefined();
  });

  it("returns true for literal 'true'", () => {
    expect(parseAllowedHostsEnv("true")).toBe(true);
    expect(parseAllowedHostsEnv("TRUE")).toBe(true);
    expect(parseAllowedHostsEnv("True")).toBe(true);
  });

  it("parses comma-separated list", () => {
    expect(parseAllowedHostsEnv("foo.com,bar.com")).toEqual([
      "foo.com",
      "bar.com",
    ]);
  });

  it("trims whitespace around entries", () => {
    expect(parseAllowedHostsEnv(" foo.com , bar.com ")).toEqual([
      "foo.com",
      "bar.com",
    ]);
  });

  it("filters empty entries from trailing commas", () => {
    expect(parseAllowedHostsEnv("foo.com,,bar.com,")).toEqual([
      "foo.com",
      "bar.com",
    ]);
  });
});
