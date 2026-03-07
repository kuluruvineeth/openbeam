import { CreateObjectInputSchema } from "@openbeam/types/services/workspace";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

async function getInitializedDb(teamId: string) {
  const { getTeamDuckDB, initializeEAVSchema } = await import(
    "@openbeam/services"
  );
  const db = await getTeamDuckDB(teamId);
  await initializeEAVSchema(db);
  return db;
}

export const workspaceRouter = createTRPCRouter({
  query: withActiveTeam
    .input(
      z.object({
        sql: z.string().min(1),
        maxRows: z.number().min(1).max(10_000).optional().default(100),
        timeoutMs: z.number().min(1000).max(30_000).optional().default(10_000),
      })
    )
    .query(async ({ ctx, input }) => {
      const { executeQuery } = await import("@openbeam/services");
      const db = await getInitializedDb(ctx.teamId);

      return executeQuery(db, input.sql, {
        readOnly: true,
        timeoutMs: input.timeoutMs,
        maxRows: input.maxRows,
      });
    }),

  listObjects: withActiveTeam.query(async ({ ctx }) => {
    const { listObjects } = await import("@openbeam/services");
    const db = await getInitializedDb(ctx.teamId);
    return listObjects(db, ctx.teamId);
  }),

  getObject: withActiveTeam
    .input(z.object({ name: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { getObject } = await import("@openbeam/services");
      const db = await getInitializedDb(ctx.teamId);
      const obj = await getObject(db, input.name);

      if (!obj) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Workspace object "${input.name}" not found`,
        });
      }

      return obj;
    }),

  createObject: withActiveTeam
    .input(CreateObjectInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { createObject } = await import("@openbeam/services");
      const db = await getInitializedDb(ctx.teamId);
      return createObject(db, input, ctx.teamId);
    }),

  listEntries: withActiveTeam
    .input(
      z.object({
        objectName: z.string().min(1),
        limit: z.number().min(1).max(1000).optional().default(50),
        offset: z.number().min(0).optional().default(0),
        orderBy: z.string().optional(),
        orderDir: z.enum(["ASC", "DESC"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { listEntries } = await import("@openbeam/services");
      const db = await getInitializedDb(ctx.teamId);

      return listEntries(db, input.objectName, {
        limit: input.limit,
        offset: input.offset,
        orderBy: input.orderBy,
        orderDir: input.orderDir,
      });
    }),

  createEntry: withActiveTeam
    .input(
      z.object({
        objectId: z.string().min(1),
        values: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { createEntry } = await import("@openbeam/services");
      const db = await getInitializedDb(ctx.teamId);
      return createEntry(db, {
        objectId: input.objectId,
        values: input.values,
      });
    }),

  updateEntry: withActiveTeam
    .input(
      z.object({
        objectName: z.string().min(1),
        entryId: z.string().min(1),
        values: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { updateEntry } = await import("@openbeam/services");
      const db = await getInitializedDb(ctx.teamId);
      return updateEntry(db, input.objectName, input.entryId, {
        values: input.values,
      });
    }),

  importData: withActiveTeam
    .input(
      z.object({
        objectName: z.string().min(1),
        format: z.enum(["csv", "json"]),
        data: z.string().min(1),
        columnMapping: z.record(z.string(), z.string()).optional(),
        createMissingFields: z.boolean().optional().default(false),
        skipInvalidRows: z.boolean().optional().default(true),
        batchSize: z.number().min(1).max(10_000).optional().default(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getInitializedDb(ctx.teamId);
      const config = {
        format: input.format as "csv" | "json",
        objectName: input.objectName,
        columnMapping: input.columnMapping,
        createMissingFields: input.createMissingFields,
        skipInvalidRows: input.skipInvalidRows,
        batchSize: input.batchSize,
      };

      if (input.format === "csv") {
        const { importCSV } = await import("@openbeam/services");
        return importCSV(db, input.data, config);
      }

      const { importJSON } = await import("@openbeam/services");
      const records: Record<string, unknown>[] = JSON.parse(input.data);
      return importJSON(db, records, config);
    }),

  nl2sql: withActiveTeam
    .input(
      z.object({
        question: z.string().min(1),
        objectName: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { listObjects, listEntries } = await import("@openbeam/services");
      const db = await getInitializedDb(ctx.teamId);

      const allObjects = await listObjects(db, ctx.teamId);

      const targetObjects = input.objectName
        ? allObjects.filter(
            (o) => o.name.toLowerCase() === input.objectName?.toLowerCase()
          )
        : allObjects;

      if (targetObjects.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: input.objectName
            ? `Workspace object "${input.objectName}" not found`
            : "No workspace objects found",
        });
      }

      const SAMPLE_LIMIT = 3;
      const objectSchemas = await Promise.all(
        targetObjects.map(async (obj) => {
          const entries = await listEntries(db, obj.name, {
            limit: SAMPLE_LIMIT,
          });
          return {
            name: obj.name,
            description: obj.description,
            fields: obj.fields.map((f) => ({
              name: f.name,
              type: f.type,
              required: f.required ?? false,
            })),
            entryCount: entries.total,
            sampleData: entries.entries.map((e) => e.values),
          };
        })
      );

      const { generateWorkspaceSql } = await import("@openbeam/services");
      const result = await generateWorkspaceSql({
        teamId: ctx.teamId,
        question: input.question,
        schema: {
          teamId: ctx.teamId,
          objects: objectSchemas,
        },
      });
      return { ...result };
    }),
});
