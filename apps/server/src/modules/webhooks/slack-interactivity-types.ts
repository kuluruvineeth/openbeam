import type {
  BlockActionPayload,
  GlobalShortcutPayload,
  HomeTabState,
  MessageShortcutPayload,
  SavedItem,
  SavedMessageData,
  SidebarContext,
  SlackClient,
  SlashCommandPayload,
  ViewSubmissionPayload,
} from "@openplane/services";

export interface SlackConnectorConfig {
  teamId?: string;
  signing_secret?: string;
}

export interface HandlerContext {
  connectorId: string;
  teamId: string;
  userId: string;
  channelId?: string;
  triggerId: string;
}

export interface StateStore {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T) => Promise<void>;
}

export interface SaveStore {
  save: (userId: string, data: SavedMessageData) => Promise<void>;
  exists: (userId: string, messageTs: string) => Promise<boolean>;
}

export interface SearchServiceDep {
  search: (params: {
    query: string;
    teamId: string;
    accessControlIds: string[];
    limit: number;
  }) => Promise<{
    documents: Array<{
      title: string;
      url: string;
      content: string;
      score: number;
      documentType: string;
    }>;
  }>;
}

export interface RagServiceDep {
  answer: (params: {
    query: string;
    teamId?: string;
    context?: string;
    accessControlIds?: string[];
    topK?: number;
    systemPrompt?: string;
  }) => Promise<{
    answer: string;
    citations: Array<{ title: string; url: string }>;
  }>;
}

export interface SidebarDeps {
  searchService: SearchServiceDep;
  ragService: RagServiceDep;
}

export type {
  BlockActionPayload,
  GlobalShortcutPayload,
  HomeTabState,
  MessageShortcutPayload,
  SavedItem,
  SavedMessageData,
  SidebarContext,
  SlackClient,
  SlashCommandPayload,
  ViewSubmissionPayload,
};
