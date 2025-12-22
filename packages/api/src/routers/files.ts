import {
  findIndexedFileForPreview,
  findIndexedMediaForPreview,
} from "@openplane/db";
import { getStorageProvider, messagesService } from "@openplane/services";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

const CUID_PATTERN = /^c[a-z0-9]{24}$/;

function isValidCuid(value: string): boolean {
  return CUID_PATTERN.test(value);
}

function parseDocumentId(documentId: string) {
  const prefixes = ["chunk-", "file-", "video_", "media_"] as const;
  const prefix = prefixes.find((p) => documentId.startsWith(p));

  if (!prefix) {
    return { type: "unknown" as const };
  }

  const rest = documentId.slice(prefix.length);
  const dashIndex = rest.indexOf("-");
  const underscoreIndex = rest.indexOf("_");
  const separatorIndex =
    dashIndex >= 0 && underscoreIndex >= 0
      ? Math.min(dashIndex, underscoreIndex)
      : Math.max(dashIndex, underscoreIndex);

  if (separatorIndex < 0) {
    return { type: "unknown" as const };
  }

  const connectorId = rest.slice(0, separatorIndex);
  const afterConnector = rest.slice(separatorIndex + 1);

  if (!isValidCuid(connectorId)) {
    return { type: "unknown" as const };
  }

  if (prefix === "chunk-") {
    const lastDash = afterConnector.lastIndexOf("-");
    return {
      type: "file" as const,
      connectorId,
      externalId:
        lastDash > 0 ? afterConnector.slice(0, lastDash) : afterConnector,
    };
  }

  if (prefix === "video_" || prefix === "media_") {
    return {
      type: "media" as const,
      connectorId,
      externalId: afterConnector,
    };
  }

  return { type: "file" as const, connectorId, externalId: afterConnector };
}

export const filesRouter = createTRPCRouter({
  getPreviewUrl: withActiveTeam
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const parsed = parseDocumentId(input.documentId);
      const isMediaPrefix =
        input.documentId.startsWith("video_") ||
        input.documentId.startsWith("media_");

      if (parsed.type === "media" || isMediaPrefix) {
        return await getMediaPreview(ctx, input.documentId, parsed);
      }

      if (parsed.type === "unknown") {
        const media = await ctx.prisma.indexedMedia.findUnique({
          where: { id: input.documentId },
          select: { id: true },
        });
        if (media) {
          return await getMediaPreview(ctx, input.documentId, parsed);
        }
      }

      return await getFilePreview(ctx, input.documentId, parsed);
    }),
});

function isGoogleWorkspaceMimeType(mimeType: string): boolean {
  return mimeType.includes("google-apps");
}

async function getFilePreview(
  ctx: { prisma: typeof import("@openplane/db").default; teamId: string },
  documentId: string,
  parsed: { connectorId?: string; externalId?: string }
) {
  const file = await findIndexedFileForPreview(ctx.prisma, {
    connectorId: parsed.connectorId,
    externalId: parsed.externalId,
    vespaId: documentId,
    id: documentId,
  });

  if (file) {
    if (file.connector.teamId !== ctx.teamId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
    }

    // Google Workspace files (Docs, Sheets, Slides) should use their webViewLink
    // for preview via iframe, not the exported S3 content
    if (isGoogleWorkspaceMimeType(file.mimeType)) {
      const doc = await messagesService.getDocument({ documentId });
      if (!doc?.url) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "External URL not found for Google Workspace file",
        });
      }
      return {
        url: doc.url,
        fileName: file.fileName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        pageCount: file.pageCount,
        isExternal: true as const,
        externalUrl: doc.url,
      };
    }

    const url = await getStorageProvider().getSignedUrl(file.storageKey, 3600);

    return {
      url,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      pageCount: file.pageCount,
      isExternal: false as const,
    };
  }

  // Fall back to Vespa for external sources (e.g., Google Drive)
  const doc = await messagesService.getDocument({ documentId });

  if (!doc?.url) {
    throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
  }

  return {
    url: doc.url,
    fileName: doc.fileName ?? doc.title ?? "File",
    mimeType: doc.mimeType ?? "application/octet-stream",
    fileSize: null,
    pageCount: null,
    isExternal: true as const,
    externalUrl: doc.url,
  };
}

async function getMediaPreview(
  ctx: { prisma: typeof import("@openplane/db").default; teamId: string },
  documentId: string,
  parsed: { connectorId?: string; externalId?: string }
) {
  const media = await findIndexedMediaForPreview(ctx.prisma, {
    connectorId: parsed.connectorId,
    externalId: parsed.externalId,
    vespaId: documentId,
    id: documentId,
  });

  if (!media) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Media not found" });
  }

  if (media.connector.teamId !== ctx.teamId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }

  const url = await getStorageProvider().getSignedUrl(media.storageKey, 3600);

  return {
    url,
    fileName: media.fileName,
    mimeType: media.mimeType,
    fileSize: media.fileSize,
    pageCount: null,
    isMedia: true as const,
    mediaType: media.mediaType,
    twelveLabsAssetId: media.twelveLabsAssetId,
    twelveLabsIndexId: media.twelveLabsIndexId,
    vespaId: media.vespaId,
    videoId: media.id,
  };
}
