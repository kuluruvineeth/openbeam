import { messagesService } from "@openbeam/services";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

export const messagesRouter = createTRPCRouter({
  getDocument: withActiveTeam
    .input(z.object({ documentId: z.string() }))
    .query(async ({ input }) => {
      const doc = await messagesService.getDocument({
        documentId: input.documentId,
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      return doc;
    }),

  getEmailThread: withActiveTeam
    .input(
      z.object({
        threadId: z.string(),
        connectorId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const thread = await messagesService.getEmailThread({
        threadId: input.threadId,
        connectorId: input.connectorId,
      });

      if (!thread) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Thread not found",
        });
      }

      return thread;
    }),

  getSlackThread: withActiveTeam
    .input(
      z.object({
        parentId: z.string(),
        connectorId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const thread = await messagesService.getSlackThread({
        parentId: input.parentId,
        connectorId: input.connectorId,
      });

      if (!thread) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parent message not found",
        });
      }

      return thread;
    }),
});
