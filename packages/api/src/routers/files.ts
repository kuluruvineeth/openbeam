import { S3StorageProvider } from "@openplane/storage";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

const CUID_LENGTH = 25;

function getStorageProvider() {
  return new S3StorageProvider({
    bucket: process.env.GCS_BUCKET ?? "openplane-files",
    region: process.env.GCS_REGION ?? "us-central1",
    endpoint: process.env.GCS_ENDPOINT,
    accessKeyId: process.env.GCS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.GCS_SECRET_ACCESS_KEY ?? "",
  });
}

function parseDocumentId(documentId: string) {
  const prefixes = ["chunk-", "file-", "video_"] as const;
  const prefix = prefixes.find((p) => documentId.startsWith(p));

  if (!prefix) {
    return { type: "unknown" as const };
  }

  const rest = documentId.slice(prefix.length);
  const connectorId = rest.slice(0, CUID_LENGTH);
  const afterConnector = rest.slice(CUID_LENGTH + 1);

  if (prefix === "chunk-") {
    const lastDash = afterConnector.lastIndexOf("-");
    return {
      type: "file" as const,
      connectorId,
      externalId:
        lastDash > 0 ? afterConnector.slice(0, lastDash) : afterConnector,
    };
  }

  if (prefix === "video_") {
    return {
      type: "video" as const,
      connectorId,
      externalId: afterConnector,
    };
  }

  return { type: "file" as const, connectorId, externalId: afterConnector };
}

const fileInclude = {
  connector: { select: { teamId: true } },
} as const;

export const filesRouter = createTRPCRouter({
  getPreviewUrl: withActiveTeam
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const parsed = parseDocumentId(input.documentId);

      if (parsed.type === "video" || input.documentId.startsWith("video_")) {
        return await getVideoPreview(ctx, input.documentId, parsed);
      }

      //TODO: Remove this legacy support for video ids that don't have a prefix
      if (parsed.type === "unknown") {
        const video = await ctx.prisma.indexedVideo.findUnique({
          where: { id: input.documentId },
          select: { id: true },
        });
        if (video) {
          return await getVideoPreview(ctx, input.documentId, parsed);
        }
      }

      return await getFilePreview(ctx, input.documentId, parsed);
    }),
});

async function getFilePreview(
  ctx: { prisma: typeof import("@openplane/db").default; teamId: string },
  documentId: string,
  parsed: { connectorId?: string; externalId?: string }
) {
  const { connectorId, externalId } = parsed;

  const file =
    (connectorId &&
      externalId &&
      (await ctx.prisma.indexedFile.findFirst({
        where: { connectorId, externalId },
        include: fileInclude,
      }))) ||
    (await ctx.prisma.indexedFile.findUnique({
      where: { vespaId: documentId },
      include: fileInclude,
    })) ||
    (await ctx.prisma.indexedFile.findUnique({
      where: { id: documentId },
      include: fileInclude,
    }));

  if (!file) {
    throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
  }

  if (file.connector.teamId !== ctx.teamId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }

  const url = await getStorageProvider().getSignedUrl(file.storageKey, 3600);

  return {
    url,
    fileName: file.fileName,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    pageCount: file.pageCount,
    isVideo: false as const,
  };
}

async function getVideoPreview(
  ctx: { prisma: typeof import("@openplane/db").default; teamId: string },
  documentId: string,
  parsed: { connectorId?: string; externalId?: string }
) {
  const { connectorId, externalId } = parsed;

  const video =
    (connectorId &&
      externalId &&
      (await ctx.prisma.indexedVideo.findFirst({
        where: { connectorId, externalId },
        include: fileInclude,
      }))) ||
    (await ctx.prisma.indexedVideo.findUnique({
      where: { vespaId: documentId },
      include: fileInclude,
    })) ||
    (await ctx.prisma.indexedVideo.findUnique({
      where: { id: documentId },
      include: fileInclude,
    }));

  if (!video) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
  }

  if (video.connector.teamId !== ctx.teamId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }

  const url = await getStorageProvider().getSignedUrl(video.storageKey, 3600);

  return {
    url,
    fileName: video.fileName,
    mimeType: video.mimeType,
    fileSize: video.fileSize,
    pageCount: null,
    isVideo: true as const,
    videoId: video.twelveLabsVideoId,
    indexId: video.twelveLabsIndexId,
    vespaId: video.vespaId,
  };
}
