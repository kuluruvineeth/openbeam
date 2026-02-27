import { beforeEach, describe, expect, it } from "bun:test";

describe("payment config", () => {
  beforeEach(() => {
    process.env.X402_ENABLED = undefined;
    process.env.X402_PAYEE_ADDRESS = undefined;
    process.env.X402_NETWORK = undefined;
  });

  it("defaults to disabled", async () => {
    const mod = await reimportConfig();
    expect(mod.paymentConfig.enabled).toBe(false);
  });

  it("enables when X402_ENABLED=true", async () => {
    process.env.X402_ENABLED = "true";
    const mod = await reimportConfig();
    expect(mod.paymentConfig.enabled).toBe(true);
  });

  it("uses default network when not set", async () => {
    const mod = await reimportConfig();
    expect(mod.paymentConfig.network).toBe("eip155:84532");
  });

  it("uses default facilitator URL", async () => {
    const mod = await reimportConfig();
    expect(mod.paymentConfig.facilitatorUrl).toBe(
      "https://facilitator.openx402.ai"
    );
  });

  it("uses custom payee address when set", async () => {
    process.env.X402_PAYEE_ADDRESS = "0xDEAD";
    const mod = await reimportConfig();
    expect(mod.paymentConfig.payeeAddress).toBe("0xDEAD");
  });
});

function reimportConfig() {
  const timestamp = Date.now();
  const path = `../../../lib/payment-config?t=${timestamp}`;
  return import(path) as Promise<typeof import("../../../lib/payment-config")>;
}
