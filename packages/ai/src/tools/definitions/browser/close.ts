import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { closeAllSessions, hasActiveSession } from "./session";

export const browserCloseTool = defineTool({
  name: "browser_close",
  description: `Close the active browser session and release all resources.

USE THIS WHEN:
- You are done with browser automation
- You want to free system resources
- You need to start fresh with a new browser session

RETURNS: Confirmation of closure.`,
  category: "browser",
  deferLoading: true,
  searchKeywords: ["close", "quit", "stop", "exit", "browser", "cleanup"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({}),

  async execute() {
    if (!hasActiveSession()) {
      return failure("INVALID_STATE", "No active browser session to close");
    }

    await closeAllSessions();

    return success({
      closed: true,
    });
  },
});
