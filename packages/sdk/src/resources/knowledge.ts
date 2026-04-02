import type { HttpClient } from "../client";
import type {
  EntityPanelResponse,
  EntitySearchOptions,
  EntitySearchResponse,
  KnowledgeRelation,
  RequestOptions,
  TopicExpertsResponse,
} from "../types";

export class KnowledgeResource {
  private readonly client: HttpClient;
  constructor(client: HttpClient) {
    this.client = client;
  }

  async searchEntities(
    query: string,
    options?: EntitySearchOptions
  ): Promise<EntitySearchResponse> {
    return await this.client.callTool<EntitySearchResponse>(
      "entity_search",
      {
        query,
        type: options?.type,
        limit: options?.limit,
      },
      options
    );
  }

  async getEntity(
    entityId: string,
    options?: RequestOptions
  ): Promise<EntityPanelResponse> {
    return await this.client.callTool<EntityPanelResponse>(
      "entity_get",
      { entityId },
      options
    );
  }

  async getRelations(
    entityId: string,
    opts?: RequestOptions & {
      direction?: "incoming" | "outgoing" | "both";
      relationType?: string;
      limit?: number;
    }
  ): Promise<{
    data: { outgoing: KnowledgeRelation[]; incoming: KnowledgeRelation[] };
  }> {
    return await this.client.callTool(
      "entity_relations",
      {
        entityId,
        direction: opts?.direction,
        relationType: opts?.relationType,
        limit: opts?.limit,
      },
      opts
    );
  }

  async topicExperts(
    topicId: string,
    options?: RequestOptions & { limit?: number }
  ): Promise<TopicExpertsResponse> {
    return await this.client.callTool<TopicExpertsResponse>(
      "topic_experts",
      { topicId, limit: options?.limit },
      options
    );
  }

  async personExpertise(
    personId: string,
    options?: RequestOptions & { limit?: number }
  ): Promise<{
    data: Array<{
      topic: { id: string; name: string | null };
      score: number | null;
    }>;
  }> {
    return await this.client.callTool(
      "person_expertise",
      { personId, limit: options?.limit },
      options
    );
  }

  async topics(
    options?: RequestOptions & { parentId?: string; limit?: number }
  ): Promise<{
    data: Array<{
      id: string;
      name: string;
      documentCount: number | null;
      children?: unknown[];
    }>;
  }> {
    return await this.client.callTool(
      "topic_list",
      { parentId: options?.parentId, limit: options?.limit },
      options
    );
  }
}
