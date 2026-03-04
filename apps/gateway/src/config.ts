import { z } from "zod";

export const GatewayAdapterConfigSchema = z.object({
  connectorId: z.string(),
  teamId: z.string(),
  protocol: z.enum(["mqtt", "opcua", "bacnet", "thingsboard", "nodered"]),
  enabled: z.boolean().default(true),
  connection: z.record(z.string(), z.unknown()),
  subscriptions: z.array(
    z.object({
      topic: z.string(),
      qos: z.number().min(0).max(2).default(1),
      payloadFormat: z
        .enum(["json", "sparkplug_b", "raw", "cbor"])
        .default("json"),
      aggregationWindow: z.number().optional(),
    })
  ),
  aggregation: z
    .object({
      defaultWindowSeconds: z.number().default(60),
      eventPassthrough: z.boolean().default(true),
      maxWindowSize: z.number().default(10_000),
    })
    .default({
      defaultWindowSeconds: 60,
      eventPassthrough: true,
      maxWindowSize: 10_000,
    }),
});

export type GatewayAdapterConfig = z.infer<typeof GatewayAdapterConfigSchema>;

export const GatewayConfigSchema = z.object({
  port: z.number().default(3003),
  metricsPort: z.number().default(9090),

  internalBroker: z
    .object({
      enabled: z.boolean().default(true),
      port: z.number().default(1884),
      persistence: z.boolean().default(true),
    })
    .default({
      enabled: true,
      port: 1884,
      persistence: true,
    }),

  adapters: z.array(GatewayAdapterConfigSchema).default([]),

  pipeline: z
    .object({
      batchSize: z.number().default(100),
      flushIntervalMs: z.number().default(5000),
      maxQueueSize: z.number().default(50_000),
    })
    .default({
      batchSize: 100,
      flushIntervalMs: 5000,
      maxQueueSize: 50_000,
    }),
});

export type GatewayConfig = z.infer<typeof GatewayConfigSchema>;

export function loadConfig(): GatewayConfig {
  return GatewayConfigSchema.parse({
    port: Number(process.env.GATEWAY_PORT) || 3003,
    metricsPort: Number(process.env.METRICS_PORT) || 9090,
  });
}
