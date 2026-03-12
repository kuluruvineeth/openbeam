import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("payment config", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.X402_ENABLED = undefined;
    process.env.X402_PAYEE_ADDRESS = undefined;
    process.env.X402_NETWORK = undefined;
    process.env.X402_FACILITATOR_URL = undefined;
    process.env.X402_RESOURCE_URL = undefined;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("defaults to disabled", () => {
    expect(process.env.X402_ENABLED).toBeUndefined();
    expect(process.env.X402_ENABLED === "true").toBe(false);
  });

  it("enables when X402_ENABLED=true", () => {
    process.env.X402_ENABLED = "true";
    expect(process.env.X402_ENABLED === "true").toBe(true);
  });

  it("uses default network when not set", () => {
    const network = process.env.X402_NETWORK ?? "eip155:84532";
    expect(network).toBe("eip155:84532");
  });

  it("uses default facilitator URL", () => {
    const url =
      process.env.X402_FACILITATOR_URL ?? "https://facilitator.openx402.ai";
    expect(url).toBe("https://facilitator.openx402.ai");
  });

  it("uses custom payee address when set", () => {
    process.env.X402_PAYEE_ADDRESS = "0xDEAD";
    const address = process.env.X402_PAYEE_ADDRESS ?? "";
    expect(address).toBe("0xDEAD");
  });
});
