import { z } from "zod";

const ComplianceProfileSchema = z.enum([
  "default",
  "regulated-legal",
  "regulated-finance",
  "regulated-health",
]);

type ComplianceProfile = z.infer<typeof ComplianceProfileSchema>;

type PolicyRule = {
  requireApproval: string[];
  blockActions: string[];
};

const COMPLIANCE_PROFILES: Record<ComplianceProfile, PolicyRule> = {
  default: {
    requireApproval: ["external_write"],
    blockActions: [],
  },
  "regulated-legal": {
    requireApproval: ["external_write", "document_export", "email_send"],
    blockActions: ["data_transfer_external"],
  },
  "regulated-finance": {
    requireApproval: [
      "external_write",
      "transaction_execute",
      "report_publish",
    ],
    blockActions: ["data_transfer_external", "unaudited_write"],
  },
  "regulated-health": {
    requireApproval: [
      "external_write",
      "patient_data_access",
      "report_publish",
    ],
    blockActions: ["data_transfer_external", "phi_export"],
  },
};

export function getComplianceProfile(profileName: string): PolicyRule {
  const profile = ComplianceProfileSchema.safeParse(profileName);
  if (!profile.success) {
    return COMPLIANCE_PROFILES.default;
  }
  return COMPLIANCE_PROFILES[profile.data];
}

export function evaluateActionPolicy(
  profileName: string,
  actionType: string
): { decision: "allow" | "require_approval" | "block"; profile: string } {
  const profile = getComplianceProfile(profileName);

  if (profile.blockActions.includes(actionType)) {
    return { decision: "block", profile: profileName };
  }

  if (profile.requireApproval.includes(actionType)) {
    return { decision: "require_approval", profile: profileName };
  }

  return { decision: "allow", profile: profileName };
}

export function getAvailableProfiles(): ComplianceProfile[] {
  return ComplianceProfileSchema.options as unknown as ComplianceProfile[];
}

export { ComplianceProfileSchema, COMPLIANCE_PROFILES };
export type { ComplianceProfile, PolicyRule };
