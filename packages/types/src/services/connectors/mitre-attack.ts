import { z } from "zod";

export const MITRE_ATTACK_STIX_BASE =
  "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master";

export const MITRE_ATTACK_ENTERPRISE_URL = `${MITRE_ATTACK_STIX_BASE}/enterprise-attack/enterprise-attack.json`;
export const MITRE_ATTACK_MOBILE_URL = `${MITRE_ATTACK_STIX_BASE}/mobile-attack/mobile-attack.json`;
export const MITRE_ATTACK_ICS_URL = `${MITRE_ATTACK_STIX_BASE}/ics-attack/ics-attack.json`;

export const StixExternalReferenceSchema = z.object({
  source_name: z.string(),
  external_id: z.string().optional(),
  url: z.string().optional(),
  description: z.string().optional(),
});

export type StixExternalReference = z.infer<typeof StixExternalReferenceSchema>;

export const StixKillChainPhaseSchema = z.object({
  kill_chain_name: z.string(),
  phase_name: z.string(),
});

export type StixKillChainPhase = z.infer<typeof StixKillChainPhaseSchema>;

export const StixBaseObjectSchema = z.object({
  type: z.string(),
  id: z.string(),
  spec_version: z.string().optional(),
  created: z.string(),
  modified: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  revoked: z.boolean().optional(),
  deprecated: z.boolean().optional(),
  external_references: z.array(StixExternalReferenceSchema).optional(),
  object_marking_refs: z.array(z.string()).optional(),
  created_by_ref: z.string().optional(),
});

export type StixBaseObject = z.infer<typeof StixBaseObjectSchema>;

export const StixAttackPatternSchema = StixBaseObjectSchema.extend({
  type: z.literal("attack-pattern"),
  kill_chain_phases: z.array(StixKillChainPhaseSchema).optional(),
  x_mitre_is_subtechnique: z.boolean().optional(),
  x_mitre_deprecated: z.boolean().optional(),
  x_mitre_platforms: z.array(z.string()).optional(),
  x_mitre_detection: z.string().optional(),
  x_mitre_data_sources: z.array(z.string()).optional(),
  x_mitre_version: z.string().optional(),
});

export type StixAttackPattern = z.infer<typeof StixAttackPatternSchema>;

export const StixTacticSchema = StixBaseObjectSchema.extend({
  type: z.literal("x-mitre-tactic"),
  x_mitre_shortname: z.string().optional(),
});

export type StixTactic = z.infer<typeof StixTacticSchema>;

export const StixIntrusionSetSchema = StixBaseObjectSchema.extend({
  type: z.literal("intrusion-set"),
  aliases: z.array(z.string()).optional(),
});

export type StixIntrusionSet = z.infer<typeof StixIntrusionSetSchema>;

export const StixMalwareSchema = StixBaseObjectSchema.extend({
  type: z.enum(["malware", "tool"]),
  is_family: z.boolean().optional(),
  x_mitre_platforms: z.array(z.string()).optional(),
  x_mitre_aliases: z.array(z.string()).optional(),
});

export type StixMalware = z.infer<typeof StixMalwareSchema>;

export const StixCourseOfActionSchema = StixBaseObjectSchema.extend({
  type: z.literal("course-of-action"),
  x_mitre_deprecated: z.boolean().optional(),
});

export type StixCourseOfAction = z.infer<typeof StixCourseOfActionSchema>;

export const StixRelationshipSchema = z.object({
  type: z.literal("relationship"),
  id: z.string(),
  created: z.string(),
  modified: z.string(),
  relationship_type: z.string(),
  source_ref: z.string(),
  target_ref: z.string(),
  description: z.string().optional(),
  revoked: z.boolean().optional(),
  external_references: z.array(StixExternalReferenceSchema).optional(),
});

export type StixRelationship = z.infer<typeof StixRelationshipSchema>;

export const StixBundleSchema = z.object({
  type: z.literal("bundle"),
  id: z.string(),
  objects: z.array(z.record(z.string(), z.unknown())),
});

export type StixBundle = z.infer<typeof StixBundleSchema>;

export const MitreAttackSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  bundleVersion: z.string().optional(),
  domainsCompleted: z.array(z.string()).optional(),
  objectsProcessed: z.number().optional(),
});

export type MitreAttackSyncCursor = z.infer<typeof MitreAttackSyncCursorSchema>;

export interface MitreAttackSyncOptions {
  cursor?: MitreAttackSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  domains?: Array<"enterprise" | "mobile" | "ics">;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const MitreAttackSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface MitreAttackSyncBatch<T> {
  items: T[];
  cursor: MitreAttackSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof MitreAttackSyncBatchStatsSchema>;
}

export interface MitreAttackTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  domain: string;
}

export const MITRE_ATTACK_STIX_TYPES = [
  "attack-pattern",
  "x-mitre-tactic",
  "intrusion-set",
  "malware",
  "tool",
  "course-of-action",
  "relationship",
] as const;

export type MitreAttackStixType = (typeof MITRE_ATTACK_STIX_TYPES)[number];

export const MitreAttackErrorCodes = {
  FETCH_FAILED: "FETCH_FAILED",
  PARSE_ERROR: "PARSE_ERROR",
  INVALID_STIX: "INVALID_STIX",
  TIMEOUT: "TIMEOUT",
} as const;

export type MitreAttackErrorCode =
  (typeof MitreAttackErrorCodes)[keyof typeof MitreAttackErrorCodes];
