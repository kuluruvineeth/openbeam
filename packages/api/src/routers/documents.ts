/**
 * Documents Router
 * Internal tRPC routes for document operations
 *
 * Uses @openplane/services for all business logic
 */

import {
  bulkDeleteDocuments,
  createDocument,
  deleteDocument,
  getDocument,
  getRecentDocuments,
  listDocuments,
  updateDocument,
} from "@openplane/services";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "..";

// ============================================================================
// Input Schemas
// ============================================================================

const listDocumentsSchema = z.object({
  connectorId: z.string().optional(),
  connectorType: z.string().optional(),
  documentType: z.string().optional(),
  authorId: z.string().optional(),
  fromDate: z.number().optional(),
  toDate: z.number().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const createDocumentSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  contentType: z.string().optional(),
  documentType: z.string().optional(),
  url: z.string().url().optional(),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
  sourceId: z.string().optional(),
  sourcePath: z.string().optional(),
  threadId: z.string().optional(),
  parentId: z.string().optional(),
  accessControl: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateDocumentSchema = z.object({
  documentId: z.string(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  contentType: z.string().optional(),
  url: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  accessControl: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

const bulkDeleteSchema = z.object({
  documentIds: z.array(z.string()).min(1).max(100),
});

const recentDocumentsSchema = z.object({
  hours: z.number().min(1).max(168).default(24),
  limit: z.number().min(1).max(100).default(20),
});

// ============================================================================
// Helper
// ============================================================================

function getAccessControlIds(session: {
  user: { id: string; email?: string | null };
}): string[] {
  return [session.user.id, session.user.email].filter(Boolean) as string[];
}

// ============================================================================
// Router
// ============================================================================

export const documentsRouter = createTRPCRouter({
  /**
   * List documents
   */
  list: protectedProcedure
    .input(listDocumentsSchema)
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await listDocuments(teamId, {
        ...input,
        accessControlIds: getAccessControlIds(ctx.session),
      });
    }),

  /**
   * Get document details
   */
  get: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const document = await getDocument(
        input.documentId,
        teamId,
        getAccessControlIds(ctx.session)
      );

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      return document;
    }),

  /**
   * Create a document
   */
  create: protectedProcedure
    .input(createDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await createDocument({
        teamId,
        ...input,
      });
    }),

  /**
   * Update a document
   */
  update: protectedProcedure
    .input(updateDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const { documentId, ...updates } = input;
      const document = await updateDocument(
        documentId,
        teamId,
        updates,
        getAccessControlIds(ctx.session)
      );

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      return document;
    }),

  /**
   * Delete a document
   */
  delete: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const success = await deleteDocument(
        input.documentId,
        teamId,
        getAccessControlIds(ctx.session)
      );

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      return { success: true };
    }),

  /**
   * Bulk delete documents
   */
  bulkDelete: protectedProcedure
    .input(bulkDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await bulkDeleteDocuments(
        input.documentIds,
        teamId,
        getAccessControlIds(ctx.session)
      );
    }),

  /**
   * Get recent documents
   */
  recent: protectedProcedure
    .input(recentDocumentsSchema)
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const documents = await getRecentDocuments(teamId, {
        hours: input.hours,
        limit: input.limit,
        accessControlIds: getAccessControlIds(ctx.session),
      });

      return { documents, hours: input.hours };
    }),
});
