import { beforeAll, describe, expect, it, mock } from "bun:test";
import type {
  ConnectorRecord,
  FetchBatchInput,
} from "../activities/connectors/types";
import type { SyncCursor } from "../workflows/types";

const mockConnectorData = {
  id: "conn-123",
  app: "linear",
  teamId: "team-456",
  status: "ACTIVE",
  workspaceExternalId: "ws-789",
  syncMode: "FULL",
  lastSyncedAt: null,
  config: { key: "value" },
};

const mockOAuthCredentials = {
  accessToken: "access-token-123",
  refreshToken: "refresh-token-456",
  tokenExpiresAt: new Date("2025-12-31"),
};

let getConnectorForSyncMock: ReturnType<typeof mock>;
let getDecryptedOAuthCredentialsMock: ReturnType<typeof mock>;

mock.module("@openplane/db", () => {
  getConnectorForSyncMock = mock(() => Promise.resolve(mockConnectorData));
  getDecryptedOAuthCredentialsMock = mock(() =>
    Promise.resolve(mockOAuthCredentials)
  );

  return {
    getConnectorForSync: getConnectorForSyncMock,
    getDecryptedOAuthCredentials: getDecryptedOAuthCredentialsMock,
  };
});

let createFetchBatchActivity: typeof import("../activities/connectors/fetch-batch").createFetchBatchActivity;
let createLoadConnectorActivity: typeof import("../activities/connectors/load-connector").createLoadConnectorActivity;

beforeAll(async () => {
  const fetchMod = await import("../activities/connectors/fetch-batch");
  createFetchBatchActivity = fetchMod.createFetchBatchActivity;

  const loadMod = await import("../activities/connectors/load-connector");
  createLoadConnectorActivity = loadMod.createLoadConnectorActivity;
});

describe("createFetchBatchActivity", () => {
  function createMockSyncGenerator(
    batches: Array<{ items: unknown[]; cursor?: SyncCursor }>
  ) {
    let batchIndex = 0;
    return function* mockSync(
      _connector: ConnectorRecord,
      _cursor?: SyncCursor
    ) {
      while (batchIndex < batches.length) {
        const batch = batches[batchIndex];
        batchIndex += 1;
        if (batch) {
          yield batch;
        }
      }
    };
  }

  it("fetches batch successfully for matching connector type", async () => {
    const syncGen = createMockSyncGenerator([
      { items: [{ id: "1" }, { id: "2" }], cursor: { page: 2 } },
    ]);
    const activities = createFetchBatchActivity("linear", syncGen);

    const input: FetchBatchInput = {
      connector: {
        id: "conn-123",
        type: "linear",
        teamId: "team-456",
        status: "ACTIVE",
        workspaceExternalId: "ws-789",
        syncMode: "FULL",
        lastSyncedAt: null,
        config: {},
      },
      batchSize: 100,
    };

    const result = await activities.fetchBatch(input);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ id: "1" });
    expect(result.nextCursor).toEqual({ page: 2 });
  });

  it("throws non-retryable error for connector type mismatch", async () => {
    const syncGen = createMockSyncGenerator([{ items: [] }]);
    const activities = createFetchBatchActivity("linear", syncGen);

    const input: FetchBatchInput = {
      connector: {
        id: "conn-123",
        type: "slack",
        teamId: "team-456",
        status: "ACTIVE",
        workspaceExternalId: "ws-789",
        syncMode: "FULL",
        lastSyncedAt: null,
        config: {},
      },
      batchSize: 100,
    };

    await expect(activities.fetchBatch(input)).rejects.toThrow(
      "Connector type mismatch: expected linear, got slack"
    );
  });

  it("returns hasMore=true when items equal batchSize", async () => {
    const syncGen = createMockSyncGenerator([
      { items: [1, 2, 3, 4, 5], cursor: { page: 2 } },
    ]);
    const activities = createFetchBatchActivity("gmail", syncGen);

    const input: FetchBatchInput = {
      connector: {
        id: "conn-123",
        type: "gmail",
        teamId: "team-456",
        status: "ACTIVE",
        workspaceExternalId: "ws-789",
        syncMode: "FULL",
        lastSyncedAt: null,
        config: {},
      },
      batchSize: 5,
    };

    const result = await activities.fetchBatch(input);

    expect(result.hasMore).toBe(true);
    expect(result.items).toHaveLength(5);
  });

  it("returns hasMore=false when items less than batchSize", async () => {
    const syncGen = createMockSyncGenerator([
      { items: [1, 2, 3], cursor: undefined },
    ]);
    const activities = createFetchBatchActivity("notion", syncGen);

    const input: FetchBatchInput = {
      connector: {
        id: "conn-123",
        type: "notion",
        teamId: "team-456",
        status: "ACTIVE",
        workspaceExternalId: "ws-789",
        syncMode: "FULL",
        lastSyncedAt: null,
        config: {},
      },
      batchSize: 100,
    };

    const result = await activities.fetchBatch(input);

    expect(result.hasMore).toBe(false);
    expect(result.items).toHaveLength(3);
  });

  it("returns empty items when generator is done", async () => {
    const syncGen = createMockSyncGenerator([]);
    const activities = createFetchBatchActivity("slack", syncGen);

    const input: FetchBatchInput = {
      connector: {
        id: "conn-123",
        type: "slack",
        teamId: "team-456",
        status: "ACTIVE",
        workspaceExternalId: "ws-789",
        syncMode: "FULL",
        lastSyncedAt: null,
        config: {},
      },
      batchSize: 100,
    };

    const result = await activities.fetchBatch(input);

    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });
});

describe("createLoadConnectorActivity", () => {
  it("loads connector with OAuth credentials", async () => {
    getConnectorForSyncMock.mockResolvedValue(mockConnectorData);
    getDecryptedOAuthCredentialsMock.mockResolvedValue(mockOAuthCredentials);

    const activities = createLoadConnectorActivity({ db: {} as never });
    const result = await activities.loadConnector("conn-123");

    expect(result.id).toBe("conn-123");
    expect(result.type).toBe("linear");
    expect(result.teamId).toBe("team-456");
    expect(result.oauthProvider).toBeDefined();
    expect(result.oauthProvider?.accessToken).toBe("access-token-123");
    expect(result.oauthProvider?.refreshToken).toBe("refresh-token-456");
  });

  it("loads connector without OAuth credentials", async () => {
    getConnectorForSyncMock.mockResolvedValue(mockConnectorData);
    getDecryptedOAuthCredentialsMock.mockResolvedValue(null);

    const activities = createLoadConnectorActivity({ db: {} as never });
    const result = await activities.loadConnector("conn-123");

    expect(result.id).toBe("conn-123");
    expect(result.oauthProvider).toBeUndefined();
  });

  it("throws non-retryable error when connector not found", async () => {
    getConnectorForSyncMock.mockResolvedValue(null);

    const activities = createLoadConnectorActivity({ db: {} as never });

    await expect(activities.loadConnector("conn-not-found")).rejects.toThrow(
      "Connector conn-not-found not found"
    );
  });

  it("maps connector fields correctly", async () => {
    const connectorWithAllFields = {
      ...mockConnectorData,
      lastSyncedAt: new Date("2025-01-01"),
      config: { feature: "enabled", limit: 100 },
    };
    getConnectorForSyncMock.mockResolvedValue(connectorWithAllFields);
    getDecryptedOAuthCredentialsMock.mockResolvedValue(null);

    const activities = createLoadConnectorActivity({ db: {} as never });
    const result = await activities.loadConnector("conn-123");

    expect(result.lastSyncedAt).toEqual(new Date("2025-01-01"));
    expect(result.config).toEqual({ feature: "enabled", limit: 100 });
    expect(result.status).toBe("ACTIVE");
    expect(result.syncMode).toBe("FULL");
    expect(result.workspaceExternalId).toBe("ws-789");
  });

  it("handles OAuth credentials with missing refreshToken", async () => {
    getConnectorForSyncMock.mockResolvedValue(mockConnectorData);
    getDecryptedOAuthCredentialsMock.mockResolvedValue({
      accessToken: "access-only",
      refreshToken: null,
      tokenExpiresAt: new Date("2025-12-31"),
    });

    const activities = createLoadConnectorActivity({ db: {} as never });
    const result = await activities.loadConnector("conn-123");

    expect(result.oauthProvider?.accessToken).toBe("access-only");
    expect(result.oauthProvider?.refreshToken).toBe("");
  });
});
