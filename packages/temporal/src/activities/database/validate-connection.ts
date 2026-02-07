import { checkConnectorHealth, type HealthStatus } from "@openplane/services";
import { logger } from "@openplane/services/lib/logger";
import type { DatabaseActivityDependencies } from "./index";
import type {
  ValidateConnectionInput,
  ValidateConnectionOutput,
} from "./types";

export function createValidateConnectionActivity(
  deps: DatabaseActivityDependencies
): (input: ValidateConnectionInput) => Promise<ValidateConnectionOutput> {
  return async (
    input: ValidateConnectionInput
  ): Promise<ValidateConnectionOutput> => {
    const { connectorId, teamId, failOnDegraded = false } = input;

    const healthResult = await checkConnectorHealth({
      db: deps.db,
      connectorId,
      teamId,
    });

    if (!healthResult) {
      logger.warn({ connectorId }, "Connector not found during health check");
      return {
        valid: false,
        status: "unknown",
        message: "Connector not found",
        canProceed: false,
      };
    }

    const canProceed = determineCanProceed(healthResult.status, failOnDegraded);

    if (!canProceed) {
      const failedChecks = healthResult.checks
        .filter((c) => c.status === "fail")
        .map((c) => `${c.name}: ${c.message ?? "failed"}`)
        .join("; ");

      logger.warn(
        {
          connectorId,
          status: healthResult.status,
          failedChecks,
        },
        "Connector health check failed"
      );

      return {
        valid: false,
        status: healthResult.status,
        message: failedChecks || `Connector is ${healthResult.status}`,
        canProceed: false,
        checks: healthResult.checks.map((c) => ({
          name: c.name,
          status: c.status,
          message: c.message,
          latencyMs: c.latencyMs,
        })),
      };
    }

    if (healthResult.status === "degraded") {
      const warningChecks = healthResult.checks
        .filter((c) => c.status === "warn")
        .map((c) => `${c.name}: ${c.message ?? "warning"}`)
        .join("; ");

      logger.info(
        {
          connectorId,
          status: healthResult.status,
          warnings: warningChecks,
        },
        "Connector health degraded but proceeding"
      );

      return {
        valid: true,
        status: healthResult.status,
        message: warningChecks,
        canProceed: true,
        checks: healthResult.checks.map((c) => ({
          name: c.name,
          status: c.status,
          message: c.message,
          latencyMs: c.latencyMs,
        })),
      };
    }

    logger.debug(
      { connectorId, status: healthResult.status },
      "Connector health check passed"
    );

    return {
      valid: true,
      status: healthResult.status,
      canProceed: true,
      checks: healthResult.checks.map((c) => ({
        name: c.name,
        status: c.status,
        message: c.message,
        latencyMs: c.latencyMs,
      })),
    };
  };
}

function determineCanProceed(
  status: HealthStatus,
  failOnDegraded: boolean
): boolean {
  switch (status) {
    case "healthy":
      return true;
    case "degraded":
      return !failOnDegraded;
    case "unhealthy":
    case "unknown":
      return false;
    default:
      return false;
  }
}
