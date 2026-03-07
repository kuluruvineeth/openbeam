import { z } from "zod";

export const DEPLOYMENT_MODES = ["local_trusted", "authenticated"] as const;
export const DeploymentModeSchema = z.enum(DEPLOYMENT_MODES);
export type DeploymentMode = z.infer<typeof DeploymentModeSchema>;

export const DEPLOYMENT_EXPOSURES = ["private", "public"] as const;
export const DeploymentExposureSchema = z.enum(DEPLOYMENT_EXPOSURES);
export type DeploymentExposure = z.infer<typeof DeploymentExposureSchema>;

export const STORAGE_PROVIDERS = ["local_disk", "s3"] as const;
export const StorageProviderSchema = z.enum(STORAGE_PROVIDERS);
export type StorageProvider = z.infer<typeof StorageProviderSchema>;

export const ControlDeploymentConfigSchema = z.object({
  mode: DeploymentModeSchema.default("local_trusted"),
  exposure: DeploymentExposureSchema.default("private"),
  bindHost: z.string().nullable().optional(),
  allowedHostnames: z.array(z.string()).optional(),
  storageProvider: StorageProviderSchema.default("local_disk"),
});

export type ControlDeploymentConfig = z.infer<
  typeof ControlDeploymentConfigSchema
>;

export const LIVE_EVENT_TYPES = [
  "heartbeat.run.queued",
  "heartbeat.run.status",
  "heartbeat.run.event",
  "heartbeat.run.log",
  "agent.status",
  "activity.logged",
] as const;

export const LiveEventTypeSchema = z.enum(LIVE_EVENT_TYPES);
export type LiveEventType = z.infer<typeof LiveEventTypeSchema>;
