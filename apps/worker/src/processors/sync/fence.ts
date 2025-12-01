import { fence } from "@openplane/redis";
import type { Span } from "@opentelemetry/api";
import { SpanStatusCode } from "@opentelemetry/api";
import logger from "../../utils/logger";

export interface FenceCheckResult {
  isFenced: boolean;
  currentToken?: number;
}

export async function checkFenceStatus(
  connectorId: string,
  jobId: string | undefined,
  span?: Span
): Promise<FenceCheckResult> {
  const isFenced = await fence.isFenced(connectorId);

  if (isFenced) {
    const currentToken = await fence.getCurrentToken(connectorId);

    span?.setAttributes({
      "fence.already_fenced": true,
      "fence.current_token": String(currentToken),
    });
    span?.setStatus({ code: SpanStatusCode.OK });

    logger.warn(
      { jobId, connectorId, currentFenceToken: currentToken },
      "Connector is already being synced by another worker, skipping"
    );

    return { isFenced: true, currentToken: currentToken ?? undefined };
  }

  return { isFenced: false };
}

export async function acquireFence(
  connectorId: string,
  jobId: string | undefined,
  span?: Span
): Promise<number> {
  const fenceToken = await fence.acquireFence(connectorId);

  span?.setAttribute("fence.token", String(fenceToken));

  logger.info({ jobId, connectorId, fenceToken }, "Acquired fence token");

  return fenceToken;
}

export async function validateFence(
  connectorId: string,
  fenceToken: number
): Promise<boolean> {
  return await fence.validateFence(connectorId, fenceToken);
}

export async function releaseFence(
  connectorId: string,
  fenceToken: number,
  jobId?: string
): Promise<boolean> {
  const released = await fence.releaseFence(connectorId, fenceToken);

  if (released) {
    logger.info({ jobId, connectorId, fenceToken }, "Released fence token");
  } else {
    logger.warn(
      { jobId, connectorId, fenceToken },
      "Failed to release fence token (may have been superseded)"
    );
  }

  return released;
}

export async function getCurrentFenceToken(
  connectorId: string
): Promise<number | null> {
  return await fence.getCurrentToken(connectorId);
}
