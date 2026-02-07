export interface MockConnector {
  id: string;
  type: string;
  teamId: string;
  status: "ACTIVE" | "INACTIVE" | "ERROR" | "SYNCING";
  workspaceExternalId?: string;
  syncMode?: "FULL" | "INCREMENTAL";
  lastSyncedAt?: Date;
  config?: Record<string, unknown>;
  oauthProvider?: {
    id: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  };
}

export interface MockDocument {
  id: string;
  externalId: string;
  connectorId: string;
  teamId: string;
  title: string;
  content?: string;
  url?: string;
  sourceType: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

let connectorCounter = 0;
let documentCounter = 0;

export function createMockConnector(
  overrides: Partial<MockConnector> = {}
): MockConnector {
  connectorCounter += 1;
  const id = `conn_test_${connectorCounter}`;

  return {
    id,
    type: "linear",
    teamId: "team_test_1",
    status: "ACTIVE",
    syncMode: "FULL",
    config: {},
    oauthProvider: {
      id: `oauth_${id}`,
      accessToken: `test_access_token_${connectorCounter}`,
      refreshToken: `test_refresh_token_${connectorCounter}`,
      expiresAt: new Date(Date.now() + 3_600_000),
    },
    ...overrides,
  };
}

export function createMockDocument(
  overrides: Partial<MockDocument> = {}
): MockDocument {
  documentCounter += 1;
  const id = `doc_test_${documentCounter}`;

  return {
    id,
    externalId: `ext_${id}`,
    connectorId: "conn_test_1",
    teamId: "team_test_1",
    title: `Test Document ${documentCounter}`,
    content: `Content for document ${documentCounter}`,
    sourceType: "linear_issue",
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockSyncCursor(
  type: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  switch (type) {
    case "linear":
      return {
        lastSyncedAt: Date.now(),
        pageInfo: { hasNextPage: false, endCursor: null },
        ...overrides,
      };

    case "notion":
      return {
        lastEditedTime: new Date().toISOString(),
        startCursor: undefined,
        ...overrides,
      };

    case "slack":
      return {
        latest: Date.now().toString(),
        channelCursors: {},
        ...overrides,
      };

    case "gmail":
      return {
        historyId: "12345",
        pageToken: undefined,
        ...overrides,
      };

    case "google-drive":
      return {
        startPageToken: "abc123",
        nextPageToken: undefined,
        ...overrides,
      };

    default:
      return {
        cursor: null,
        timestamp: Date.now(),
        ...overrides,
      };
  }
}

export function createMockBatch(
  count: number,
  connectorId = "conn_test_1"
): MockDocument[] {
  return Array.from({ length: count }, (_, i) =>
    createMockDocument({
      connectorId,
      title: `Batch Document ${i + 1}`,
    })
  );
}

export function resetFixtures(): void {
  connectorCounter = 0;
  documentCounter = 0;
}
