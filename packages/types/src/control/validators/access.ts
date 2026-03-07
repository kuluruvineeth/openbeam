import { z } from "zod";
import {
  INVITE_JOIN_TYPES,
  JOIN_REQUEST_STATUSES,
  PERMISSION_KEYS,
} from "../access";
import { CONTROL_AGENT_ADAPTER_TYPES } from "../agents";

const JOIN_REQUEST_TYPES = ["human", "agent"] as const;

export const CreateControlInviteInputSchema = z.object({
  allowedJoinTypes: z.enum(INVITE_JOIN_TYPES).default("both"),
  expiresInHours: z.number().int().min(1).max(720).optional().default(72),
  defaultsPayload: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type CreateControlInviteInput = z.infer<
  typeof CreateControlInviteInputSchema
>;

export const AcceptControlInviteInputSchema = z.object({
  requestType: z.enum(JOIN_REQUEST_TYPES),
  agentName: z.string().min(1).max(120).optional(),
  adapterType: z.enum(CONTROL_AGENT_ADAPTER_TYPES).optional(),
  capabilities: z.string().max(4000).nullable().optional(),
  agentDefaultsPayload: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type AcceptControlInviteInput = z.infer<
  typeof AcceptControlInviteInputSchema
>;

export const ListControlJoinRequestsQuerySchema = z.object({
  status: z.enum(JOIN_REQUEST_STATUSES).optional(),
  requestType: z.enum(JOIN_REQUEST_TYPES).optional(),
});

export type ListControlJoinRequestsQuery = z.infer<
  typeof ListControlJoinRequestsQuerySchema
>;

export const ClaimControlJoinRequestApiKeyInputSchema = z.object({
  claimSecret: z.string().min(16).max(256),
});

export type ClaimControlJoinRequestApiKeyInput = z.infer<
  typeof ClaimControlJoinRequestApiKeyInputSchema
>;

export const UpdateControlMemberPermissionsInputSchema = z.object({
  grants: z.array(
    z.object({
      permissionKey: z.enum(PERMISSION_KEYS),
      scope: z.record(z.string(), z.unknown()).nullable().optional(),
    })
  ),
});

export type UpdateControlMemberPermissionsInput = z.infer<
  typeof UpdateControlMemberPermissionsInputSchema
>;
