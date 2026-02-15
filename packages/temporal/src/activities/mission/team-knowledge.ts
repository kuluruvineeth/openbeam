import { createHash, randomUUID } from "node:crypto";
import { type Database, Prisma } from "@openplane/db";

function computeContentHash(content: string, category: string): string {
  return createHash("sha256")
    .update(`${category}:${content.toLowerCase().trim()}`)
    .digest("hex");
}

export function createTeamKnowledgeActivities(deps: { db: Database }) {
  const { db } = deps;

  return {
    async queryTeamKnowledge(input: {
      teamId: string;
      query: string;
      categories?: string[];
      minConfidence?: number;
      limit?: number;
      excludeMissionId?: string;
    }): Promise<{
      entries: Array<{
        id: string;
        content: string;
        category: string;
        confidence: number;
        sources: string[];
        createdByMissionId: string;
      }>;
    }> {
      const minConfidence = input.minConfidence ?? 0.5;
      const limit = input.limit ?? 10;
      const whereClauses: Prisma.Sql[] = [
        Prisma.sql`"teamId" = ${input.teamId}`,
        Prisma.sql`confidence >= ${minConfidence}`,
      ];

      if (input.categories && input.categories.length > 0) {
        whereClauses.push(
          Prisma.sql`category IN (${Prisma.join(input.categories)})`
        );
      }
      if (input.excludeMissionId) {
        whereClauses.push(
          Prisma.sql`"createdByMissionId" <> ${input.excludeMissionId}`
        );
      }
      if (input.query.trim().length > 0) {
        whereClauses.push(
          Prisma.sql`content ILIKE ${`%${input.query.trim()}%`}`
        );
      }

      const entries = await db.$queryRaw<
        Array<{
          id: string;
          content: string;
          category: string;
          confidence: number;
          sources: string[] | null;
          createdByMissionId: string;
        }>
      >(Prisma.sql`
        SELECT id, content, category, confidence, sources, "createdByMissionId"
        FROM team_knowledge
        WHERE ${Prisma.join(whereClauses, " AND ")}
        ORDER BY confidence DESC, "accessCount" DESC
        LIMIT ${limit}
      `);

      const normalizedEntries = entries.map((entry) => ({
        ...entry,
        sources: entry.sources ?? [],
      }));

      if (normalizedEntries.length > 0) {
        await db.$executeRaw(Prisma.sql`
          UPDATE team_knowledge
          SET "accessCount" = "accessCount" + 1, "lastAccessedAt" = NOW()
          WHERE id IN (${Prisma.join(normalizedEntries.map((entry) => entry.id))})
        `);
      }

      return { entries: normalizedEntries };
    },

    async storeTeamKnowledge(input: {
      teamId: string;
      missionId: string;
      content: string;
      category: string;
      sources: string[];
      confidence: number;
    }): Promise<{ knowledgeId: string; deduplicated: boolean }> {
      const contentHash = computeContentHash(input.content, input.category);
      const existing = await db.$queryRaw<
        Array<{ id: string; confidence: number }>
      >(
        Prisma.sql`
          SELECT id, confidence
          FROM team_knowledge
          WHERE "teamId" = ${input.teamId} AND "contentHash" = ${contentHash}
          LIMIT 1
        `
      );

      const existingEntry = existing[0];
      if (existingEntry) {
        await db.$transaction(async (tx) => {
          await tx.$executeRaw(Prisma.sql`
            UPDATE team_knowledge
            SET confidence = GREATEST(confidence, ${input.confidence}),
                "accessCount" = "accessCount" + 1,
                "lastAccessedAt" = NOW()
            WHERE id = ${existingEntry.id}
          `);
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO team_knowledge_mission_link (id, "knowledgeId", "missionId", "accessedAt")
            VALUES (${randomUUID()}, ${existingEntry.id}, ${input.missionId}, NOW())
            ON CONFLICT ("knowledgeId", "missionId")
            DO UPDATE SET "accessedAt" = NOW()
          `);
        });
        return { knowledgeId: existingEntry.id, deduplicated: true };
      }

      const knowledgeId = randomUUID();
      await db.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO team_knowledge (
            id,
            "teamId",
            "contentHash",
            content,
            category,
            sources,
            confidence,
            "accessCount",
            "createdByMissionId",
            "lastAccessedAt",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${knowledgeId},
            ${input.teamId},
            ${contentHash},
            ${input.content},
            ${input.category},
            ${input.sources},
            ${input.confidence},
            0,
            ${input.missionId},
            NOW(),
            NOW(),
            NOW()
          )
        `);
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO team_knowledge_mission_link (id, "knowledgeId", "missionId", "accessedAt")
          VALUES (${randomUUID()}, ${knowledgeId}, ${input.missionId}, NOW())
        `);
      });

      return { knowledgeId, deduplicated: false };
    },
  };
}
