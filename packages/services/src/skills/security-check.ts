import { z } from "zod";

const SecurityViolationSchema = z.object({
  rule: z.string(),
  severity: z.enum(["warning", "error", "critical"]),
  detail: z.string(),
});

const SecurityCheckResultSchema = z.object({
  passed: z.boolean(),
  violations: z.array(SecurityViolationSchema),
});

type SecurityViolation = z.infer<typeof SecurityViolationSchema>;
type SecurityCheckResult = z.infer<typeof SecurityCheckResultSchema>;

const BLOCKED_TOOLS = ["shell_exec", "file_delete", "database_drop"];

const RESTRICTED_OUTBOUND = ["*.onion", "localhost", "127.0.0.1", "0.0.0.0"];

export function checkToolAllowlist(
  requestedTools: string[],
  allowedTools: string[]
): SecurityViolation[] {
  const violations: SecurityViolation[] = [];

  for (const tool of requestedTools) {
    if (BLOCKED_TOOLS.includes(tool)) {
      violations.push({
        rule: "blocked_tool",
        severity: "critical",
        detail: `Tool "${tool}" is permanently blocked`,
      });
      continue;
    }

    if (allowedTools.length > 0 && !allowedTools.includes(tool)) {
      violations.push({
        rule: "tool_not_allowed",
        severity: "error",
        detail: `Tool "${tool}" is not in the allowlist`,
      });
    }
  }

  return violations;
}

export function checkConnectorScopes(
  requestedScopes: string[],
  grantedScopes: string[]
): SecurityViolation[] {
  const violations: SecurityViolation[] = [];

  for (const scope of requestedScopes) {
    if (!(grantedScopes.includes(scope) || grantedScopes.includes("*"))) {
      violations.push({
        rule: "scope_not_granted",
        severity: "error",
        detail: `Scope "${scope}" has not been granted`,
      });
    }
  }

  return violations;
}

export function checkOutboundDestinations(
  destinations: string[]
): SecurityViolation[] {
  const violations: SecurityViolation[] = [];

  for (const dest of destinations) {
    for (const restricted of RESTRICTED_OUTBOUND) {
      if (restricted.startsWith("*.")) {
        const suffix = restricted.slice(1);
        if (dest.endsWith(suffix)) {
          violations.push({
            rule: "restricted_destination",
            severity: "critical",
            detail: `Destination "${dest}" matches restricted pattern "${restricted}"`,
          });
        }
      } else if (dest === restricted || dest.includes(restricted)) {
        violations.push({
          rule: "restricted_destination",
          severity: "critical",
          detail: `Destination "${dest}" is restricted`,
        });
      }
    }
  }

  return violations;
}

export function runSecurityCheck(config: {
  requestedTools?: string[];
  allowedTools?: string[];
  requestedScopes?: string[];
  grantedScopes?: string[];
  outboundDestinations?: string[];
}): SecurityCheckResult {
  const violations: SecurityViolation[] = [];

  if (config.requestedTools) {
    violations.push(
      ...checkToolAllowlist(config.requestedTools, config.allowedTools ?? [])
    );
  }

  if (config.requestedScopes) {
    violations.push(
      ...checkConnectorScopes(
        config.requestedScopes,
        config.grantedScopes ?? []
      )
    );
  }

  if (config.outboundDestinations) {
    violations.push(...checkOutboundDestinations(config.outboundDestinations));
  }

  const hasCritical = violations.some((v) => v.severity === "critical");
  const hasError = violations.some((v) => v.severity === "error");

  return {
    passed: !(hasCritical || hasError),
    violations,
  };
}

export { SecurityCheckResultSchema, SecurityViolationSchema };
export type { SecurityCheckResult, SecurityViolation };
