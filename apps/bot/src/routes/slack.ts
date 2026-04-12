import db from "@openbeam/db";
import type { Hono } from "hono";
import { slackAdapter } from "../adapters";
import {
  handleCancellation,
  handleConfirmation,
} from "../handlers/confirmation";
import { handleFeedback, parseFeedbackAction } from "../handlers/feedback";
import { resolveIdentity } from "../identity/resolver";
import { extractHeaders, standardWebhook } from "./shared";

const FEEDBACK_THANKS = {
  replace_original: true,
  blocks: [
    {
      type: "section",
      text: { type: "mrkdwn", text: "Thanks for your feedback!" },
    },
  ],
};

export function registerSlackRoutes(routes: Hono): void {
  routes.post("/webhooks/slack", async (c) => {
    const rawBody = await c.req.text();
    const headers = extractHeaders(c.req.raw.headers);
    const result = await standardWebhook(slackAdapter, rawBody, headers);
    return c.json({ ok: result.ok, error: result.error }, result.status as 200);
  });

  routes.post("/webhooks/slack/interactions", async (c) => {
    const body = await c.req.parseBody();
    const rawPayload = typeof body.payload === "string" ? body.payload : "";
    if (!rawPayload) {
      return c.json({ ok: false }, 400);
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      return c.json({ ok: false }, 400);
    }

    if (payload.type !== "block_actions") {
      return c.json({ ok: true });
    }

    const actions = payload.actions as
      | Array<{ action_id: string; value: string }>
      | undefined;
    const action = actions?.[0];

    if (!action) {
      return c.json({ ok: true });
    }

    const user = payload.user as { id: string } | undefined;
    const team = payload.team as { id: string } | undefined;
    if (!(user && team)) {
      return c.json({ ok: true });
    }

    const identity = await resolveIdentity(db, {
      id: "",
      platform: "SLACK",
      platformUserId: user.id,
      platformTeamId: team.id,
      channelId: "",
      text: "",
      isDirectMessage: false,
      isMention: false,
      timestamp: new Date(),
      rawEvent: null,
    });

    if (!identity) {
      return c.json({ ok: true });
    }

    if (action.action_id.startsWith("confirm:")) {
      const pendingId = action.action_id.slice(8);
      const msg = buildStubMessage(user.id, team.id);
      const response = await handleConfirmation(msg, identity, pendingId);
      return c.json({
        replace_original: true,
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: response.text },
          },
        ],
      });
    }

    if (action.action_id.startsWith("cancel:")) {
      const pendingId = action.action_id.slice(7);
      const response = handleCancellation(pendingId);
      return c.json({
        replace_original: true,
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: response.text },
          },
        ],
      });
    }

    if (
      action.action_id === "feedback_thumbs_up" ||
      action.action_id === "feedback_thumbs_down"
    ) {
      const parsed = parseFeedbackAction(action.value);
      if (parsed) {
        await handleFeedback({
          platform: "SLACK",
          platformUserId: user.id,
          responseId: parsed.responseId,
          rating: parsed.rating,
          identity,
        });
      }
      return c.json(FEEDBACK_THANKS);
    }

    return c.json({ ok: true });
  });
}

function buildStubMessage(userId: string, teamId: string) {
  return {
    id: "",
    platform: "SLACK" as const,
    platformUserId: userId,
    platformTeamId: teamId,
    channelId: "",
    text: "",
    isDirectMessage: false,
    isMention: false,
    timestamp: new Date(),
    rawEvent: null,
    interactionType: "button" as const,
  };
}
