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
  const prefixes = ["chunk-", "file-"] as const;
  const prefix = prefixes.find((p) => documentId.startsWith(p));

  if (!prefix) {
    return {};
  }

  const rest = documentId.slice(prefix.length);
  const connectorId = rest.slice(0, CUID_LENGTH);
  const afterConnector = rest.slice(CUID_LENGTH + 1);

  if (prefix === "chunk-") {
    const lastDash = afterConnector.lastIndexOf("-");
    return {
      connectorId,
      externalId:
        lastDash > 0 ? afterConnector.slice(0, lastDash) : afterConnector,
    };
  }

  return { connectorId, externalId: afterConnector };
}

const fileInclude = {
  connector: { select: { teamId: true } },
} as const;

export const filesRouter = createTRPCRouter({
  getPreviewUrl: withActiveTeam
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { connectorId, externalId } = parseDocumentId(input.documentId);

      const file =
        (connectorId &&
          externalId &&
          (await ctx.prisma.indexedFile.findFirst({
            where: { connectorId, externalId },
            include: fileInclude,
          }))) ||
        (await ctx.prisma.indexedFile.findUnique({
          where: { vespaId: input.documentId },
          include: fileInclude,
        })) ||
        (await ctx.prisma.indexedFile.findUnique({
          where: { id: input.documentId },
          include: fileInclude,
        }));

      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
      }

      if (file.connector.teamId !== ctx.teamId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const url = await getStorageProvider().getSignedUrl(
        file.storageKey,
        3600
      );

      return {
        url,
        fileName: file.fileName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        pageCount: file.pageCount,
      };
    }),
});
