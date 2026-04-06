import { z } from "zod";
import {
  formatSessionCommit,
  formatSessionCreate,
  formatSessionHistory,
  formatSessionMessage,
} from "../formatters";
import { sanitize, sanitizeArray } from "../mcp.sanitize";
import { getSessionManager } from "../mcp.services";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
  WRITE_ANNOTATIONS,
} from "../mcp.types";
import { truncateListResponse, withErrorHandling } from "../mcp.utils";

const mcpSessionSchema = z.object({
  id: z.string(),
  agentId: z.string().nullable().optional(),
  totalTokens: z.number().nullable().optional(),
  archiveCount: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const registerSessionTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "context.write")) {
    return;
  }

  server.registerTool(
    "session_create",
    {
      title: "Create Context Session",
      description:
        "Create a new context session for tracking a conversation. Sessions accumulate messages and auto-extract memories when committed. " +
        "Use when starting a multi-turn interaction that should be remembered. " +
        "After creating, use session_message to add messages, then session_commit to persist learnings.",
      inputSchema: {
        agentId: z
          .string()
          .optional()
          .describe(
            "Agent ID if this session is agent-driven. Omit for user sessions."
          ),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const manager = getSessionManager();
      const session = await manager.create(
        ctx.teamId,
        ctx.userId,
        params.agentId
      );

      const result = {
        id: session.id,
        agentId: session.agentId,
        totalTokens: session.totalTokens,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      };

      const clean = sanitize(mcpSessionSchema, result);
      return {
        content: [{ type: "text" as const, text: formatSessionCreate(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to create session")
  );

  server.registerTool(
    "session_message",
    {
      title: "Add Session Message",
      description:
        "Add a message to an active context session. Messages accumulate token counts for auto-commit threshold tracking. " +
        "Use to record conversation turns that should contribute to memory extraction when the session is committed. " +
        "Requires a session_id from session_create.",
      inputSchema: {
        sessionId: z
          .string()
          .min(1)
          .describe("Session ID from session_create."),
        role: z.enum(["user", "assistant", "tool"]).describe("Message role."),
        content: z.string().min(1).describe("Message content."),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const manager = getSessionManager();

      await manager.addMessage(params.sessionId, params.role, params.content);

      const messages = await manager.getMessages(params.sessionId);
      const session = messages.length > 0 ? { totalTokens: 0 } : null;

      if (!session) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Session not found or access denied.",
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: formatSessionMessage(
              params.sessionId,
              params.role,
              messages.length
            ),
          },
        ],
        structuredContent: {
          data: {
            sessionId: params.sessionId,
            role: params.role,
            messageCount: messages.length,
          },
        },
      };
    }, "Failed to add session message")
  );

  server.registerTool(
    "session_commit",
    {
      title: "Commit Context Session",
      description:
        "Commit an active session, marking it for memory extraction. " +
        "Committed sessions have their messages analyzed to extract user preferences, entities, events, and patterns as persistent memories. " +
        "Use when a meaningful conversation is complete and its learnings should be remembered. " +
        "After committing, the session cannot accept new messages.",
      inputSchema: {
        sessionId: z
          .string()
          .min(1)
          .describe("Session ID from session_create."),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const manager = getSessionManager();
      const result = await manager.commit(params.sessionId);

      return {
        content: [
          {
            type: "text" as const,
            text: formatSessionCommit(params.sessionId, 0, 0),
          },
        ],
        structuredContent: {
          data: {
            sessionId: params.sessionId,
            status: "committed",
            workflowId: result?.workflowId ?? null,
          },
        },
      };
    }, "Failed to commit session")
  );

  server.registerTool(
    "session_history",
    {
      title: "List Context Sessions",
      description:
        "List recent context sessions for the current user. " +
        "Shows session status (active, committed, archived), message count, and token usage. " +
        "Use to review past sessions or find an active session to continue.",
      inputSchema: {
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe("Max sessions to return (default 20)."),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const take = params.limit ?? 20;
      const manager = getSessionManager();
      const sessions = await manager.list(ctx.teamId, ctx.userId, take);

      const results = sessions.map((s) => ({
        id: s.id,
        agentId: s.agentId,
        totalTokens: s.totalTokens,
        archiveCount: s.archiveCount,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }));

      const data = sanitizeArray(mcpSessionSchema, results);
      const response = {
        meta: {
          totalResults: data.length,
          hasNextPage: false,
        },
        data,
      };

      const { structuredContent } = truncateListResponse(response);
      return {
        content: [{ type: "text" as const, text: formatSessionHistory(data) }],
        structuredContent,
      };
    }, "Failed to list sessions")
  );
};
