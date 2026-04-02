import { HttpClient } from "./client";
import { ActionsResource } from "./resources/actions";
import { AgentsResource } from "./resources/agents";
import { ApiKeysResource } from "./resources/apikeys";
import { ConnectorsResource } from "./resources/connectors";
import { KnowledgeResource } from "./resources/knowledge";
import { SearchResource } from "./resources/search";
import { SyncResource } from "./resources/sync";
import { TeamResource } from "./resources/team";
import type { OpenBeamConfig } from "./types";

export class OpenBeam {
  readonly search: SearchResource;
  readonly connectors: ConnectorsResource;
  readonly sync: SyncResource;
  readonly actions: ActionsResource;
  readonly team: TeamResource;
  readonly knowledge: KnowledgeResource;
  readonly agents: AgentsResource;
  readonly apiKeys: ApiKeysResource;

  constructor(config: OpenBeamConfig) {
    const client = new HttpClient(config);
    this.search = new SearchResource(client);
    this.connectors = new ConnectorsResource(client);
    this.sync = new SyncResource(client);
    this.actions = new ActionsResource(client);
    this.team = new TeamResource(client);
    this.knowledge = new KnowledgeResource(client);
    this.agents = new AgentsResource(client);
    this.apiKeys = new ApiKeysResource(client);
  }
}

export default OpenBeam;

export {
  AuthenticationError,
  NotFoundError,
  OpenBeamError,
  PermissionError,
  RateLimitError,
  ServerError,
  ToolError,
} from "./errors";

export type {
  ActionExecuteResponse,
  ActionsListOptions,
  ActionsListResponse,
  AgentRunOptions,
  AgentRunResponse,
  AgentTemplate,
  AnswerResponse,
  AskQuestionOptions,
  AvailableConnector,
  Connector,
  ConnectorAction,
  ConnectorAvailableOptions,
  ConnectorAvailableResponse,
  ConnectorDetail,
  ConnectorHealth,
  ConnectorListOptions,
  ConnectorListResponse,
  ContextDetail,
  ContextEntry,
  ContextReadOptions,
  ContextSearchOptions,
  ContextSearchResponse,
  EntityPanelResponse,
  EntitySearchOptions,
  EntitySearchResponse,
  KnowledgeEntity,
  KnowledgeRelation,
  OpenBeamConfig,
  PersonResult,
  RecentResult,
  RequestOptions,
  SearchByAuthorOptions,
  SearchByAuthorResponse,
  SearchDocumentsOptions,
  SearchDocumentsResponse,
  SearchPeopleOptions,
  SearchPeopleResponse,
  SearchRecentOptions,
  SearchRecentResponse,
  SearchResult,
  SearchSemanticOptions,
  SearchSemanticResponse,
  SearchSimilarOptions,
  SearchSimilarResponse,
  SyncControlResponse,
  SyncErrorEntry,
  SyncErrorsResponse,
  SyncHealthEntry,
  SyncHealthResponse,
  SyncHistoryOptions,
  SyncHistoryResponse,
  SyncJob,
  SyncProgressEntry,
  SyncProgressResponse,
  SyncStatusResponse,
  SyncTriggerAllResponse,
  SyncTriggerResponse,
  Team,
  TeamMember,
  TopicExpertsResponse,
} from "./types";
