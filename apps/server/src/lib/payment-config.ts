export const paymentConfig = {
  enabled: process.env.X402_ENABLED === "true",
  payeeAddress: process.env.X402_PAYEE_ADDRESS ?? "",
  network: (process.env.X402_NETWORK ??
    "eip155:84532") as `${string}:${string}`,
  facilitatorUrl:
    process.env.X402_FACILITATOR_URL ?? "https://facilitator.openx402.ai",
  resourceUrl: process.env.X402_RESOURCE_URL ?? "http://localhost:3000",
} as const;
