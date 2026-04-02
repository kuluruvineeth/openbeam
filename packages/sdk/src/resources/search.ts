import type { HttpClient } from "../client";
import type {
  SearchByAuthorOptions,
  SearchByAuthorResponse,
  SearchDocumentsOptions,
  SearchDocumentsResponse,
  SearchPeopleOptions,
  SearchPeopleResponse,
  SearchRecentOptions,
  SearchRecentResponse,
  SearchSemanticOptions,
  SearchSemanticResponse,
  SearchSimilarOptions,
  SearchSimilarResponse,
} from "../types";

export class SearchResource {
  private readonly client: HttpClient;
  constructor(client: HttpClient) {
    this.client = client;
  }

  async documents(
    query: string,
    options?: SearchDocumentsOptions
  ): Promise<SearchDocumentsResponse> {
    return await this.client.callTool<SearchDocumentsResponse>(
      "search_documents",
      {
        query,
        limit: options?.limit,
        cursor: options?.cursor,
        connectorTypes: options?.connectorTypes,
        documentTypes: options?.documentTypes,
        authorIds: options?.authorIds,
        ranking: options?.ranking,
        dateFrom: options?.dateFrom,
        dateTo: options?.dateTo,
      },
      options
    );
  }

  async people(
    query: string,
    options?: SearchPeopleOptions
  ): Promise<SearchPeopleResponse> {
    return await this.client.callTool<SearchPeopleResponse>(
      "search_people",
      {
        query,
        limit: options?.limit,
        connectorTypes: options?.connectorTypes,
      },
      options
    );
  }

  async recent(options?: SearchRecentOptions): Promise<SearchRecentResponse> {
    return await this.client.callTool<SearchRecentResponse>(
      "search_recent",
      {
        hours: options?.hours,
        connectorTypes: options?.connectorTypes,
        limit: options?.limit,
      },
      options
    );
  }

  async semantic(
    query: string,
    options?: SearchSemanticOptions
  ): Promise<SearchSemanticResponse> {
    return await this.client.callTool<SearchSemanticResponse>(
      "search_semantic",
      {
        query,
        limit: options?.limit,
        connectorTypes: options?.connectorTypes,
      },
      options
    );
  }

  async similar(
    documentId: string,
    options?: SearchSimilarOptions
  ): Promise<SearchSimilarResponse> {
    return await this.client.callTool<SearchSimilarResponse>(
      "search_similar",
      {
        documentId,
        limit: options?.limit,
      },
      options
    );
  }

  async byAuthor(
    authorId: string,
    options?: SearchByAuthorOptions
  ): Promise<SearchByAuthorResponse> {
    return await this.client.callTool<SearchByAuthorResponse>(
      "search_by_author",
      {
        authorId,
        query: options?.query,
        limit: options?.limit,
      },
      options
    );
  }
}
