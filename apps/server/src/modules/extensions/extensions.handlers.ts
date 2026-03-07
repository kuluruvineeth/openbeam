import type { RouteHandler } from "@hono/zod-openapi";
import {
  ExtensionServiceError,
  submitExtensionChatForTeam,
} from "@openbeam/services/extension-api";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type { submitExtensionChatRoute } from "./extensions.routes";

export const submitExtensionChatHandler: RouteHandler<
  typeof submitExtensionChatRoute,
  AuthEnv
> = async (c) => {
  const input = c.req.valid("json");

  try {
    const response = await submitExtensionChatForTeam({
      teamId: getTeamId(c),
      sessionId: input.sessionId,
      prompt: input.prompt,
      pageUrl: input.pageContext?.url,
      hostDecisionMode: input.hostDecision?.mode,
    });

    return c.json(response, 200);
  } catch (error) {
    if (error instanceof ExtensionServiceError) {
      if (error.code === "HOST_BLOCKED") {
        return c.json({ error: error.message, code: error.code }, 403);
      }
      return c.json({ error: error.message, code: error.code }, 400);
    }

    return c.json(
      { error: "Failed to process extension chat request", code: "UNKNOWN" },
      400
    );
  }
};
