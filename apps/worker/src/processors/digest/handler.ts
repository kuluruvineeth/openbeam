import prisma, {
  getDecryptedOAuthCredentials,
  updateDigestDelivery,
} from "@openplane/db";
import type { DigestJobData } from "@openplane/redis";
import {
  buildDigestBlocks,
  createSlackClient,
  generateDailyDigest,
} from "@openplane/services";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Job } from "bullmq";
import logger from "../../utils/logger";
import { logJobError, logJobStart } from "../event-handlers";

const tracer = trace.getTracer("openplane-worker");

export interface DigestJobResult {
  delivered: boolean;
  messageTs?: string;
  error?: string;
}

export async function processDigestJob(
  job: Job<DigestJobData>
): Promise<DigestJobResult> {
  const {
    subscriptionId,
    connectorId,
    userId,
    slackUserId,
    teamId,
    channelIds,
    topics,
    deliveryTime,
    timezone,
    frequency,
  } = job.data;

  const span = tracer.startSpan("digest-processor.process", {
    attributes: {
      "job.id": job.id ?? "",
      "subscription.id": subscriptionId,
      "connector.id": connectorId,
      "user.id": userId,
    },
  });

  try {
    logJobStart("digest", job.id, { subscriptionId, connectorId });

    const credentials = await getDecryptedOAuthCredentials(prisma, connectorId);
    if (!credentials?.accessToken) {
      throw new Error("No access token for connector");
    }

    const client = createSlackClient({
      token: credentials.accessToken,
      connectorId,
    });

    const digest = await generateDailyDigest({
      userId,
      slackUserId,
      teamId,
      connectorId,
      channelIds,
      topics,
      deliveryTime,
      timezone,
      frequency,
      accessControlIds: [userId, `team:${teamId}`],
    });

    if (!digest) {
      logger.info({ subscriptionId }, "No content for digest, skipping");
      await updateDigestDelivery(prisma, subscriptionId);
      return { delivered: false, error: "No content" };
    }

    const blocks = buildDigestBlocks(digest);
    const response = await client.call("chat.postMessage", {
      channel: slackUserId,
      blocks,
      text: "Your daily digest is ready",
    });

    const messageTs = (response as { ts?: string }).ts;

    await updateDigestDelivery(prisma, subscriptionId);

    span.setAttributes({ "digest.delivered": true });
    span.setStatus({ code: SpanStatusCode.OK });

    logger.info({ subscriptionId, messageTs }, "Digest delivered successfully");

    return { delivered: true, messageTs };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
    span.recordException(error as Error);

    logJobError("digest", job.id, error, { subscriptionId, connectorId });

    await updateDigestDelivery(prisma, subscriptionId, errorMessage);

    return { delivered: false, error: errorMessage };
  } finally {
    span.end();
  }
}
