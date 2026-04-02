import type { HttpClient } from "../client";
import type {
  AgentRunOptions,
  AgentRunResponse,
  AgentTemplate,
  AnswerResponse,
  AskQuestionOptions,
  ContextDetail,
  ContextReadOptions,
  ContextSearchOptions,
  ContextSearchResponse,
  RequestOptions,
} from "../types";

export class AgentsResource {
  private readonly client: HttpClient;
  constructor(client: HttpClient) {
    this.client = client;
  }

  async list(
    options?: RequestOptions & { category?: "analysis" | "content" }
  ): Promise<{ data: AgentTemplate[] }> {
    return await this.client.callTool(
      "agent_list",
      { category: options?.category },
      options
    );
  }

  async run(
    agentName: string,
    input: string,
    options?: AgentRunOptions
  ): Promise<AgentRunResponse> {
    return await this.client.callTool<AgentRunResponse>(
      "agent_run",
      {
        agentName,
        input,
        maxSources: options?.maxSources,
      },
      options
    );
  }

  async ask(
    question: string,
    options?: AskQuestionOptions
  ): Promise<AnswerResponse> {
    return await this.client.callTool<AnswerResponse>(
      "ask_question",
      {
        question,
        connectorTypes: options?.connectorTypes,
        maxSources: options?.maxSources,
      },
      options
    );
  }

  async contextSearch(
    query: string,
    options?: ContextSearchOptions
  ): Promise<ContextSearchResponse> {
    return await this.client.callTool<ContextSearchResponse>(
      "context_search",
      {
        query,
        contextType: options?.contextType,
        category: options?.category,
        limit: options?.limit,
      },
      options
    );
  }

  async contextRead(
    uri: string,
    options?: ContextReadOptions
  ): Promise<{ data: ContextDetail }> {
    return await this.client.callTool<{ data: ContextDetail }>(
      "context_read",
      { uri, level: options?.level },
      options
    );
  }
}
