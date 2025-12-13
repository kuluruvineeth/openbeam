import prisma from "@openplane/db";
import { TwelveLabsClient } from "@openplane/media";

export class MediaIndexService {
  private readonly client: TwelveLabsClient;

  constructor() {
    this.client = new TwelveLabsClient();
  }

  async getOrCreateTeamIndex(teamId: string): Promise<string> {
    const existing = await prisma.teamMediaIndex.findUnique({
      where: { teamId },
    });

    if (existing) {
      return existing.twelveLabsIndexId;
    }

    const indexName = `openplane_${teamId}`;
    const twelveLabsIndexId = await this.client.createIndex(indexName, {
      models: [
        { modelName: "marengo3.0", modelOptions: ["visual", "audio"] },
        { modelName: "pegasus1.2", modelOptions: ["visual", "audio"] },
      ],
    });

    try {
      await prisma.teamMediaIndex.create({
        data: {
          teamId,
          twelveLabsIndexId,
          indexName,
        },
      });
    } catch (error) {
      // Handle race condition: another process may have created the record
      if (
        error instanceof Error &&
        error.message.includes("Unique constraint")
      ) {
        const raceWinner = await prisma.teamMediaIndex.findUnique({
          where: { teamId },
        });
        if (raceWinner) {
          return raceWinner.twelveLabsIndexId;
        }
      }
      throw error;
    }

    return twelveLabsIndexId;
  }

  async getTeamIndex(teamId: string): Promise<string | null> {
    const existing = await prisma.teamMediaIndex.findUnique({
      where: { teamId },
    });

    return existing?.twelveLabsIndexId ?? null;
  }

  async deleteTeamIndex(teamId: string): Promise<void> {
    const existing = await prisma.teamMediaIndex.findUnique({
      where: { teamId },
    });

    if (!existing) {
      return;
    }

    await this.client.deleteIndex(existing.twelveLabsIndexId);

    await prisma.teamMediaIndex.delete({
      where: { teamId },
    });
  }
}

export const mediaIndexService = new MediaIndexService();
