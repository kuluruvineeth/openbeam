import { z } from "zod";
import { ServiceStatusSchema } from "./health";
import { EdgeTierSchema, HardwareCapabilitiesSchema } from "./tiers";

export const NodeRegistrationSchema = z.object({
  nodeId: z.string().min(1),
  name: z.string().min(1),
  tier: EdgeTierSchema,
  capabilities: HardwareCapabilitiesSchema,
  status: ServiceStatusSchema,
  version: z.string(),
  registeredAt: z.number(),
  lastHeartbeatAt: z.number(),
  tags: z.record(z.string(), z.string()).default({}),
  location: z.string().optional(),
});

export type NodeRegistration = z.infer<typeof NodeRegistrationSchema>;

export const NodeFilterSchema = z.object({
  tiers: z.array(EdgeTierSchema).optional(),
  statuses: z.array(ServiceStatusSchema).optional(),
  tags: z.record(z.string(), z.string()).optional(),
  minRamMb: z.number().int().positive().optional(),
  hasGpu: z.boolean().optional(),
  location: z.string().optional(),
});

export type NodeFilter = z.infer<typeof NodeFilterSchema>;

export const DeploymentStatusSchema = z.enum([
  "pending",
  "deploying",
  "active",
  "rolling_back",
  "failed",
]);

export type DeploymentStatus = z.infer<typeof DeploymentStatusSchema>;

export const DeploymentSchema = z.object({
  id: z.string(),
  version: z.string(),
  status: DeploymentStatusSchema,
  targetNodes: z.array(z.string()),
  completedNodes: z.array(z.string()).default([]),
  failedNodes: z.array(z.string()).default([]),
  startedAt: z.number(),
  completedAt: z.number().optional(),
});

export type Deployment = z.infer<typeof DeploymentSchema>;

export const FleetOverviewSchema = z.object({
  totalNodes: z.number().int().nonnegative(),
  healthyNodes: z.number().int().nonnegative(),
  degradedNodes: z.number().int().nonnegative(),
  unhealthyNodes: z.number().int().nonnegative(),
  tierDistribution: z.record(z.string(), z.number().int().nonnegative()),
  activeDeployments: z.number().int().nonnegative(),
  totalDocuments: z.number().int().nonnegative(),
  lastUpdatedAt: z.number(),
});

export type FleetOverview = z.infer<typeof FleetOverviewSchema>;

export interface FleetManager {
  registerNode(registration: NodeRegistration): Promise<void>;
  deregisterNode(nodeId: string): Promise<void>;
  heartbeat(nodeId: string): Promise<void>;
  listNodes(filter?: NodeFilter): Promise<NodeRegistration[]>;
  getNode(nodeId: string): Promise<NodeRegistration | undefined>;
  getOverview(): Promise<FleetOverview>;
  deploy(deployment: Deployment): Promise<void>;
  getDeployment(id: string): Promise<Deployment | undefined>;
}
