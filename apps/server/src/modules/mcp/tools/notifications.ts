import db, {
  getUnreadNotificationCount,
  listMcpNotifications,
  markAllMcpNotificationsRead,
  markMcpNotificationsRead,
} from "@openbeam/db";
import { z } from "zod";
import { formatNotificationList, formatNotificationMark } from "../formatters";
import { sanitizeArray } from "../mcp.sanitize";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
  WRITE_ANNOTATIONS,
} from "../mcp.types";
import { truncateListResponse, withErrorHandling } from "../mcp.utils";

const mcpNotificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable().optional(),
  sourceType: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
  connectorId: z.string().nullable().optional(),
  read: z.boolean(),
  createdAt: z.string(),
});

export const registerNotificationTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "notifications.read")) {
    return;
  }

  server.registerTool(
    "notifications_list",
    {
      title: "List Notifications",
      description:
        "List recent notifications for the team — sync completions, connector status changes, new document batches, alerts, and team events. " +
        "Returns most recent first with cursor-based pagination. " +
        "Filter by type (e.g. 'sync.completed') or unread status. " +
        "After reviewing, use notifications_mark to mark them as read.",
      inputSchema: {
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe("Max notifications to return (default 25, max 50)."),
        cursor: z
          .string()
          .optional()
          .describe(
            "Pagination cursor from a previous response's nextCursor field."
          ),
        unreadOnly: z
          .boolean()
          .optional()
          .describe("If true, only return unread notifications."),
        type: z
          .string()
          .optional()
          .describe(
            "Filter by notification type: 'sync.completed', 'sync.failed', 'sync.started', " +
              "'connector.connected', 'connector.disconnected', 'connector.error', " +
              "'document.new_batch', 'alert.triggered', 'team.member_joined'."
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const { items, nextCursor, hasMore } = await listMcpNotifications(
        db,
        ctx.teamId,
        {
          limit: params.limit,
          cursor: params.cursor,
          unreadOnly: params.unreadOnly,
          type: params.type,
        }
      );

      const unreadCount = await getUnreadNotificationCount(db, ctx.teamId);

      const results = items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        sourceType: n.sourceType,
        sourceId: n.sourceId,
        connectorId: n.connectorId,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      }));

      const data = sanitizeArray(mcpNotificationSchema, results);
      const response = {
        meta: {
          totalResults: data.length,
          unreadCount,
          cursor: nextCursor,
          hasNextPage: hasMore,
        },
        data,
      };

      const { structuredContent } = truncateListResponse(response);
      return {
        content: [
          {
            type: "text" as const,
            text: formatNotificationList(data, unreadCount),
          },
        ],
        structuredContent,
      };
    }, "Failed to list notifications")
  );

  if (!hasScope(ctx, "notifications.write")) {
    return;
  }

  server.registerTool(
    "notifications_mark",
    {
      title: "Mark Notifications Read",
      description:
        "Mark one or more notifications as read, or mark all notifications as read. " +
        "Pass specific notification IDs from notifications_list, or set markAll to true to clear all unread. " +
        "Use after reviewing notifications to keep the unread count accurate.",
      inputSchema: {
        notificationIds: z
          .array(z.string())
          .optional()
          .describe(
            "Specific notification IDs to mark as read (from notifications_list)."
          ),
        markAll: z
          .boolean()
          .optional()
          .describe(
            "If true, mark ALL unread notifications as read. Overrides notificationIds."
          ),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      let affected: number;

      if (params.markAll) {
        const result = await markAllMcpNotificationsRead(db, ctx.teamId);
        affected = result.count;
      } else if (params.notificationIds && params.notificationIds.length > 0) {
        const result = await markMcpNotificationsRead(
          db,
          ctx.teamId,
          params.notificationIds
        );
        affected = result.count;
      } else {
        return {
          content: [
            {
              type: "text" as const,
              text: "Provide notificationIds or set markAll: true.",
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: formatNotificationMark(affected, !!params.markAll),
          },
        ],
        structuredContent: {
          data: { affected, markAll: !!params.markAll },
        },
      };
    }, "Failed to mark notifications")
  );
};
