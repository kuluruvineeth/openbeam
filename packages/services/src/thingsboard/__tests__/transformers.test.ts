import { describe, expect, it } from "bun:test";
import type {
  ThingsboardAlarm,
  ThingsboardDashboard,
  ThingsboardDevice,
  ThingsboardTransformContext,
} from "@openplane/types/services/connectors/thingsboard";
import { transformAlarm, transformAlarms } from "../transformers/alarm";
import {
  transformDashboard,
  transformDashboards,
} from "../transformers/dashboard";
import { transformDevice, transformDevices } from "../transformers/device";

const baseContext: ThingsboardTransformContext = {
  connectorId: "conn_tb_1",
  connectorType: "THINGSBOARD",
  teamId: "team_1",
  workspaceId: "ws_1",
  baseUrl: "https://thingsboard.example.com",
};

function createMockDevice(
  overrides?: Partial<ThingsboardDevice>
): ThingsboardDevice {
  return {
    id: { id: "dev-001", entityType: "DEVICE" },
    name: "Temperature Sensor",
    type: "thermostat",
    label: "Main Floor Thermostat",
    createdTime: 1_705_312_200_000,
    customerId: { id: "cust-001", entityType: "CUSTOMER" },
    deviceProfileId: { id: "prof-001", entityType: "DEVICE_PROFILE" },
    additionalInfo: { active: true },
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
    endTs: 1_705_315_800_000,
    originator: { id: "dev-001", entityType: "DEVICE" },
    originatorName: "Temperature Sensor",
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
    assignedCustomers: [
      { customerId: { id: "cust-001" } },
      { customerId: { id: "cust-002" } },
    ],
    ...overrides,
  };
}

describe("thingsboard transformers", () => {
  describe("transformDevice", () => {
    it("generates correct ID format", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.id).toBe("conn_tb_1_device_dev-001");
    });

    it("uses label as title when present", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.title).toBe("Main Floor Thermostat");
    });

    it("falls back to name when label is absent", async () => {
      const doc = await transformDevice(
        createMockDevice({ label: undefined }),
        baseContext
      );

      expect(doc.title).toBe("Temperature Sensor");
    });

    it("sets correct document type and subtype", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.document_type).toBe("device");
      expect(doc.document_subtype).toBe("iot_device");
    });

    it("sets source fields", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.source_type).toBe("thingsboard");
      expect(doc.source_name).toBe("ThingsBoard");
    });

    it("builds URL with baseUrl", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.url).toBe("https://thingsboard.example.com/devices/dev-001");
    });

    it("includes device metadata", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.metadata?.deviceId).toBe("dev-001");
      expect(doc.metadata?.deviceType).toBe("thermostat");
      expect(doc.metadata?.customerId).toBe("cust-001");
      expect(doc.metadata?.deviceProfileId).toBe("prof-001");
      expect(doc.metadata?.active).toBe("true");
    });

    it("builds content with Type, Label, and Created lines", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.content).toContain("Type: thermostat");
      expect(doc.content).toContain("Label: Main Floor Thermostat");
      expect(doc.content).toContain("Created:");
    });

    it("omits label in content when same as name", async () => {
      const doc = await transformDevice(
        createMockDevice({ label: "Temperature Sensor" }),
        baseContext
      );

      expect(doc.content).not.toContain("Label:");
    });

    it("uses createdTime for timestamps", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.created_at).toBe(1_705_312_200_000);
      expect(doc.updated_at).toBe(1_705_312_200_000);
    });

    it("sets access_control with team scope", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.access_control).toEqual(["team:team_1"]);
    });

    it("generates deterministic checksums", async () => {
      const device = createMockDevice();
      const doc1 = await transformDevice(device, baseContext);
      const doc2 = await transformDevice(device, baseContext);

      expect(doc1.checksum).toBe(doc2.checksum);
      expect(doc1.checksum).toBeDefined();
    });

    it("transforms multiple devices", async () => {
      const devices = [
        createMockDevice({ id: { id: "d1", entityType: "DEVICE" } }),
        createMockDevice({ id: { id: "d2", entityType: "DEVICE" } }),
      ];

      const docs = await transformDevices(devices, baseContext);

      expect(docs).toHaveLength(2);
      expect(docs[0]?.external_id).toBe("d1");
      expect(docs[1]?.external_id).toBe("d2");
    });
  });

  describe("transformAlarm", () => {
    it("generates correct ID format", async () => {
      const doc = await transformAlarm(createMockAlarm(), baseContext);

      expect(doc.id).toBe("conn_tb_1_alarm_alarm-001");
    });

    it("sets title as [severity] type", async () => {
      const doc = await transformAlarm(createMockAlarm(), baseContext);

      expect(doc.title).toBe("[CRITICAL] High Temperature");
    });

    it("sets document_type to alarm", async () => {
      const doc = await transformAlarm(createMockAlarm(), baseContext);

      expect(doc.document_type).toBe("alarm");
    });

    it("sets subtype to severity lowercased", async () => {
      const doc = await transformAlarm(createMockAlarm(), baseContext);

      expect(doc.document_subtype).toBe("critical");
    });

    it("builds content with Type, Status, Originator, Start, and End", async () => {
      const doc = await transformAlarm(createMockAlarm(), baseContext);

      expect(doc.content).toContain("Type: High Temperature");
      expect(doc.content).toContain("Status: ACTIVE_UNACK");
      expect(doc.content).toContain("Originator: Temperature Sensor");
      expect(doc.content).toContain("Start:");
      expect(doc.content).toContain("End:");
    });

    it("includes alarm metadata", async () => {
      const doc = await transformAlarm(createMockAlarm(), baseContext);

      expect(doc.metadata?.alarmId).toBe("alarm-001");
      expect(doc.metadata?.severity).toBe("CRITICAL");
      expect(doc.metadata?.status).toBe("ACTIVE_UNACK");
      expect(doc.metadata?.originatorName).toBe("Temperature Sensor");
      expect(doc.metadata?.startTs).toBe(1_705_312_200_000);
      expect(doc.metadata?.endTs).toBe(1_705_315_800_000);
    });

    it("uses startTs as created_at and endTs as updated_at", async () => {
      const doc = await transformAlarm(createMockAlarm(), baseContext);

      expect(doc.created_at).toBe(1_705_312_200_000);
      expect(doc.updated_at).toBe(1_705_315_800_000);
    });

    it("falls back to startTs for updated_at when endTs is absent", async () => {
      const doc = await transformAlarm(
        createMockAlarm({ endTs: undefined }),
        baseContext
      );

      expect(doc.updated_at).toBe(1_705_312_200_000);
    });

    it("builds URL with baseUrl", async () => {
      const doc = await transformAlarm(createMockAlarm(), baseContext);

      expect(doc.url).toBe("https://thingsboard.example.com/alarms/alarm-001");
    });

    it("generates deterministic checksums", async () => {
      const alarm = createMockAlarm();
      const doc1 = await transformAlarm(alarm, baseContext);
      const doc2 = await transformAlarm(alarm, baseContext);

      expect(doc1.checksum).toBe(doc2.checksum);
      expect(doc1.checksum).toBeDefined();
    });

    it("transforms multiple alarms", async () => {
      const alarms = [
        createMockAlarm({ id: { id: "a1", entityType: "ALARM" } }),
        createMockAlarm({ id: { id: "a2", entityType: "ALARM" } }),
      ];

      const docs = await transformAlarms(alarms, baseContext);

      expect(docs).toHaveLength(2);
      expect(docs[0]?.external_id).toBe("a1");
      expect(docs[1]?.external_id).toBe("a2");
    });
  });

  describe("transformDashboard", () => {
    it("generates correct ID format", async () => {
      const doc = await transformDashboard(createMockDashboard(), baseContext);

      expect(doc.id).toBe("conn_tb_1_dashboard_dash-001");
    });

    it("uses dashboard title as document title", async () => {
      const doc = await transformDashboard(createMockDashboard(), baseContext);

      expect(doc.title).toBe("Factory Overview");
    });

    it("sets correct document type and subtype", async () => {
      const doc = await transformDashboard(createMockDashboard(), baseContext);

      expect(doc.document_type).toBe("dashboard");
      expect(doc.document_subtype).toBe("iot_dashboard");
    });

    it("builds content with Title and Assigned Customers", async () => {
      const doc = await transformDashboard(createMockDashboard(), baseContext);

      expect(doc.content).toContain("Title: Factory Overview");
      expect(doc.content).toContain("Assigned Customers:");
      expect(doc.content).toContain("cust-001");
      expect(doc.content).toContain("cust-002");
    });

    it("includes dashboard metadata", async () => {
      const doc = await transformDashboard(createMockDashboard(), baseContext);

      expect(doc.metadata?.dashboardId).toBe("dash-001");
      expect(doc.metadata?.assignedCustomers).toBe(
        JSON.stringify(["cust-001", "cust-002"])
      );
    });

    it("uses createdTime for timestamps", async () => {
      const doc = await transformDashboard(createMockDashboard(), baseContext);

      expect(doc.created_at).toBe(1_705_312_200_000);
      expect(doc.updated_at).toBe(1_705_312_200_000);
    });

    it("builds URL with baseUrl", async () => {
      const doc = await transformDashboard(createMockDashboard(), baseContext);

      expect(doc.url).toBe(
        "https://thingsboard.example.com/dashboards/dash-001"
      );
    });

    it("generates deterministic checksums", async () => {
      const dashboard = createMockDashboard();
      const doc1 = await transformDashboard(dashboard, baseContext);
      const doc2 = await transformDashboard(dashboard, baseContext);

      expect(doc1.checksum).toBe(doc2.checksum);
      expect(doc1.checksum).toBeDefined();
    });

    it("transforms multiple dashboards", async () => {
      const dashboards = [
        createMockDashboard({ id: { id: "d1", entityType: "DASHBOARD" } }),
        createMockDashboard({ id: { id: "d2", entityType: "DASHBOARD" } }),
      ];

      const docs = await transformDashboards(dashboards, baseContext);

      expect(docs).toHaveLength(2);
      expect(docs[0]?.external_id).toBe("d1");
      expect(docs[1]?.external_id).toBe("d2");
    });
  });
});
