import { describe, expect, it } from "bun:test";
import type { Database } from "@openbeam/db";
import {
  ConnectorServiceError,
  createManualConnectorSyncForTeam,
  getConnectorSyncHistoryForTeam,
  pauseConnectorForTeam,
  resumeConnectorForTeam,
} from "../connectors";

function createDatabaseStub(options?: {
  connectorStatus?: "ACTIVE" | "INACTIVE" | "ERROR";
  hasConnector?: boolean;
}) {
  const connectorStatus = options?.connectorStatus ?? "ACTIVE";
  const hasConnector = options?.hasConnector ?? true;

  return {
    connector: {
      findUnique: async () =>
        hasConnector
          ? {
              id: "connector_1",
              status: connectorStatus,
              teamId: "team_1",
              app: "GOOGLE_DRIVE",
              lastSyncedAt: null,
              lastSyncStatus: null,
              lastError: null,
              lastErrorAt: null,
              scheduledDeletionAt: null,
              webhookConfig: null,
            }
          : null,
      update: async () => ({}),
    },
    syncJob: {
      create: async () => ({ id: "job_1" }),
    },
    syncHistory: {
      create: async () => ({ id: "history_1" }),
      findMany: async () => [],
      count: async () => 0,
      findFirst: async () => null,
    },
    indexedDocument: {
      count: async () => 0,
    },
    indexedFile: {
      count: async () => 0,
    },
    indexedMedia: {
      count: async () => 0,
    },
    connectorResource: {
      count: async () => 0,
    },
  } as unknown as Database;
}

describe("connectors service", () => {
  it("creates manual sync for active connector", async () => {
    const db = createDatabaseStub();
    const result = await createManualConnectorSyncForTeam(db, {
      connectorId: "connector_1",
      teamId: "team_1",
      type: "INCREMENTAL",
    });
    expect(result.syncHistoryId).toBe("history_1");
    expect(result.syncType).toBe("INCREMENTAL");
    expect(result.connectorType).toBe("google-drive");
  });

  it("fails when team is missing", async () => {
    const db = createDatabaseStub();
    await expect(
      createManualConnectorSyncForTeam(db, {
        connectorId: "connector_1",
        teamId: null,
        type: "FULL",
      })
    ).rejects.toBeInstanceOf(ConnectorServiceError);
  });

  it("fails when connector is not active", async () => {
    const db = createDatabaseStub({ connectorStatus: "INACTIVE" });
    await expect(
      createManualConnectorSyncForTeam(db, {
        connectorId: "connector_1",
        teamId: "team_1",
        type: "FULL",
      })
    ).rejects.toBeInstanceOf(ConnectorServiceError);
  });

  it("returns not found when connector is missing", async () => {
    const db = createDatabaseStub({ hasConnector: false });
    await expect(
      getConnectorSyncHistoryForTeam(db, {
        connectorId: "connector_1",
        teamId: "team_1",
        limit: 20,
        offset: 0,
      })
    ).rejects.toBeInstanceOf(ConnectorServiceError);
  });

  it("pauses connector", async () => {
    const db = createDatabaseStub();
    const result = await pauseConnectorForTeam(db, {
      connectorId: "connector_1",
      teamId: "team_1",
    });
    expect(result.success).toBe(true);
  });

  it("resumes connector", async () => {
    const db = createDatabaseStub();
    const result = await resumeConnectorForTeam(db, {
      connectorId: "connector_1",
      teamId: "team_1",
    });
    expect(result.success).toBe(true);
  });
});
