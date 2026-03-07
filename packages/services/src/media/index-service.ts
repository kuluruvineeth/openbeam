import prisma, {
  createTeamMediaIndex,
  deleteTeamMediaIndex,
  findTeamMediaIndex,
} from "@openbeam/db";
import { TwelveLabsClient } from "@openbeam/media";

export class MediaIndexService {
  private readonly client: TwelveLabsClient;

  constructor() {
    this.client = new TwelveLabsClient();
  }

  async getOrCreateTeamIndex(teamId: string): Promise<string> {
    const existing = await findTeamMediaIndex(prisma, teamId);

    if (existing) {
      return existing.twelveLabsIndexId;
    }

    const indexName = `openbeam_${teamId}`;
    const twelveLabsIndexId = await this.client.createIndex(indexName, {
      models: [
        { modelName: "marengo3.0", modelOptions: ["visual", "audio"] },
        { modelName: "pegasus1.2", modelOptions: ["visual", "audio"] },
      ],
    });

    try {
      await createTeamMediaIndex(prisma, {
        teamId,
        twelveLabsIndexId,
        indexName,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Unique constraint")
      ) {
        const raceWinner = await findTeamMediaIndex(prisma, teamId);
        if (raceWinner) {
          return raceWinner.twelveLabsIndexId;
        }
      }
      throw error;
    }

    return twelveLabsIndexId;
  }

  async getTeamIndex(teamId: string): Promise<string | null> {
    const existing = await findTeamMediaIndex(prisma, teamId);
    return existing?.twelveLabsIndexId ?? null;
  }

  async deleteTeamIndex(teamId: string): Promise<void> {
    const existing = await findTeamMediaIndex(prisma, teamId);

    if (!existing) {
      return;
    }

    await this.client.deleteIndex(existing.twelveLabsIndexId);
    await deleteTeamMediaIndex(prisma, teamId);
  }
}

export const mediaIndexService = new MediaIndexService();
