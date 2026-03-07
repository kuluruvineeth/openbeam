import { describe, expect, it } from "bun:test";
import type {
  ThingsboardAlarm,
  ThingsboardDashboard,
  ThingsboardDevice,
  ThingsboardPageData,
  ThingsboardTransformContext,
} from "@openbeam/types/services/connectors/thingsboard";
import type { ThingsboardClient } from "../client";
import { fullSync } from "../sync/full";

function createMockDevice(
  overrides?: Partial<ThingsboardDevice>
): ThingsboardDevice {
  return {
    id: { id: "dev-001", entityType: "DEVICE" },
    name: "Temperature Sensor",
    type: "SENSOR",
    createdTime: 1_705_312_200_000,
    ...overrides,
  };
}

function createMockAlarm(
  overrides?: Partial<ThingsboardAlarm>
): ThingsboardAlarm {
  return {
    id: { id: "alarm-001", entityType: "ALARM" },
    type: "High Temperature",
    severity: "CRITICAL",
    status: "ACTIVE_UNACK",
    startTs: 1_705_312_200_000,
    originator: { id: "dev-001", entityType: "DEVICE" },
    ...overrides,
  };
}

function createMockDashboard(
  overrides?: Partial<ThingsboardDashboard>
): ThingsboardDashboard {
  return {
    id: { id: "dash-001", entityType: "DASHBOARD" },
    title: "Factory Overview",
    createdTime: 1_705_312_200_000,
    ...overrides,
  };
}

function createMockClient(options?: {
  devices?: ThingsboardDevice[];
  alarms?: ThingsboardAlarm[];
  dashboards?: ThingsboardDashboard[];
  devicePages?: number;
}): ThingsboardClient {
  const devices = options?.devices ?? [createMockDevice()];
  const alarms = options?.alarms ?? [createMockAlarm()];
  const dashboards = options?.dashboards ?? [createMockDashboard()];
  const totalDevicePages = options?.devicePages ?? 1;

  return {
    connectorId: "conn_tb_1",
    listDevices: (params?: {
      page?: number;
      pageSize?: number;
    }): Promise<ThingsboardPageData<ThingsboardDevice>> => {
      const page = params?.page ?? 0;
      if (page >= totalDevicePages) {
        return Promise.resolve({
          data: [],
          totalPages: totalDevicePages,
          totalElements: 0,
          hasNext: false,
        });
      }
      return Promise.resolve({
        data:
          page === 0
            ? devices
            : devices.map((d, i) => ({
                ...d,
                id: { ...d.id, id: `dev-page${page}-${i}` },
              })),
        totalPages: totalDevicePages,
        totalElements: devices.length * totalDevicePages,
        hasNext: page < totalDevicePages - 1,
      });
    },
    listAlarms: (_params?: {
      page?: number;
      pageSize?: number;
    }): Promise<ThingsboardPageData<ThingsboardAlarm>> =>
      Promise.resolve({
        data: alarms,
        totalPages: 1,
        totalElements: alarms.length,
        hasNext: false,
      }),
    listDashboards: (_params?: {
      page?: number;
      pageSize?: number;
    }): Promise<ThingsboardPageData<ThingsboardDashboard>> =>
      Promise.resolve({
        data: dashboards,
        totalPages: 1,
        totalElements: dashboards.length,
        hasNext: false,
      }),
    getDeviceTelemetry: async () => ({}),
    getDeviceAttributes: async () => [],
    healthCheck: async () => true,
  } as ThingsboardClient;
}

const baseContext: ThingsboardTransformContext = {
  connectorId: "conn_tb_1",
  connectorType: "THINGSBOARD",
  teamId: "team_1",
  workspaceId: "ws_1",
  baseUrl: "https://thingsboard.example.com",
};

describe("thingsboard sync", () => {
  describe("fullSync", () => {
    it("yields devices, alarms, and dashboards in order", async () => {
      const client = createMockClient();
      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext)) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(3);
      expect(batches[0]?.stage).toBe("devices");
      expect(batches[1]?.stage).toBe("alarms");
      expect(batches[2]?.stage).toBe("dashboards");
    });

    it("sets hasMore true while stages remain", async () => {
      const client = createMockClient();
      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext)) {
        batches.push(batch);
      }

      expect(batches[0]?.hasMore).toBe(true);
      expect(batches[1]?.hasMore).toBe(true);
      expect(batches[2]?.hasMore).toBe(false);
    });

    it("skips alarms when syncAlarms is false", async () => {
      const client = createMockClient();
      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext, {
        syncAlarms: false,
      })) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(2);
      expect(batches[0]?.stage).toBe("devices");
      expect(batches[1]?.stage).toBe("dashboards");
    });

    it("skips dashboards when syncDashboards is false", async () => {
      const client = createMockClient();
      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext, {
        syncDashboards: false,
      })) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(2);
      expect(batches[0]?.stage).toBe("devices");
      expect(batches[1]?.stage).toBe("alarms");
    });

    it("handles paginated device responses", async () => {
      const client = createMockClient({ devicePages: 2 });
      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext)) {
        batches.push(batch);
      }

      const deviceBatches = batches.filter((b) => b.stage === "devices");
      expect(deviceBatches).toHaveLength(2);
    });

    it("includes items in each batch", async () => {
      const client = createMockClient({
        devices: [
          createMockDevice(),
          createMockDevice({
            id: { id: "dev-002", entityType: "DEVICE" },
            name: "Humidity Sensor",
          }),
        ],
        alarms: [createMockAlarm()],
        dashboards: [createMockDashboard()],
      });

      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext)) {
        batches.push(batch);
      }

      expect(batches[0]?.items).toHaveLength(2);
      expect(batches[1]?.items).toHaveLength(1);
      expect(batches[2]?.items).toHaveLength(1);
    });

    it("includes cursor with lastSyncTime", async () => {
      const client = createMockClient();
      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext)) {
        batches.push(batch);
      }

      for (const batch of batches) {
        expect(batch.cursor.lastSyncTime).toBeGreaterThan(0);
      }
    });
  });
});
