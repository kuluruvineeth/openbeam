import db from "@openbeam/db";
import type { Hono } from "hono";
import { slackAdapter } from "../adapters";
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

    if (
      !action ||
      (action.action_id !== "feedback_thumbs_up" &&
        action.action_id !== "feedback_thumbs_down")
    ) {
      return c.json({ ok: true });
    }

    const parsed = parseFeedbackAction(action.value);
    if (!parsed) {
      return c.json({ ok: true });
    }

    const user = payload.user as { id: string } | undefined;
    const team = payload.team as { id: string } | undefined;

    if (user && team) {
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

      if (identity) {
        await handleFeedback({
          platform: "SLACK",
          platformUserId: user.id,
          responseId: parsed.responseId,
          rating: parsed.rating,
          identity,
        });
      }
    }

    return c.json(FEEDBACK_THANKS);
  });
}
