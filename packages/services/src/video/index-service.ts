import prisma from "@openplane/db";
import { TwelveLabsClient } from "@openplane/video";

export class VideoIndexService {
  private readonly client: TwelveLabsClient;

  constructor() {
    this.client = new TwelveLabsClient();
  }

  async getOrCreateTeamIndex(teamId: string): Promise<string> {
    const existing = await prisma.teamVideoIndex.findUnique({
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

    await prisma.teamVideoIndex.create({
      data: {
        teamId,
        twelveLabsIndexId,
        indexName,
      },
    });

    return twelveLabsIndexId;
  }

  async getTeamIndex(teamId: string): Promise<string | null> {
    const existing = await prisma.teamVideoIndex.findUnique({
      where: { teamId },
    });

    return existing?.twelveLabsIndexId ?? null;
  }

  async deleteTeamIndex(teamId: string): Promise<void> {
    const existing = await prisma.teamVideoIndex.findUnique({
      where: { teamId },
    });

    if (!existing) {
      return;
    }

    await this.client.deleteIndex(existing.twelveLabsIndexId);

    await prisma.teamVideoIndex.delete({
      where: { teamId },
    });
  }
}

export const videoIndexService = new VideoIndexService();
