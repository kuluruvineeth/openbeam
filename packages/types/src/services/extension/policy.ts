import { z } from "zod";

export const ExtensionHostAccessModeSchema = z.enum(["allow", "ask", "block"]);
export type ExtensionHostAccessMode = z.infer<
  typeof ExtensionHostAccessModeSchema
>;

export const ExtensionHostPolicyRuleSchema = z.object({
  hostPattern: z.string().min(1),
  mode: ExtensionHostAccessModeSchema,
  reason: z.string().optional(),
});
export type ExtensionHostPolicyRule = z.infer<
  typeof ExtensionHostPolicyRuleSchema
>;

export const ExtensionHostPolicySchema = z.object({
  defaultMode: ExtensionHostAccessModeSchema.default("ask"),
  rules: z.array(ExtensionHostPolicyRuleSchema).default([]),
});
export type ExtensionHostPolicy = z.infer<typeof ExtensionHostPolicySchema>;

export const ExtensionHostPolicyDecisionSchema = z.object({
  hostname: z.string().min(1),
  mode: ExtensionHostAccessModeSchema,
  matchedRule: z.string().optional(),
  evaluatedAtMs: z.number().int().nonnegative(),
});
export type ExtensionHostPolicyDecision = z.infer<
  typeof ExtensionHostPolicyDecisionSchema
>;
