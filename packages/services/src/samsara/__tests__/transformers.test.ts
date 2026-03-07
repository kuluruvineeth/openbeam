import { describe, expect, it } from "bun:test";
import type { SamsaraTransformContext } from "@openbeam/types/services/connectors/samsara";
import type { SamsaraAlert } from "../transformers/alert";
import { transformAlert, transformAlerts } from "../transformers/alert";
import type { SamsaraDriver } from "../transformers/driver";
import { transformDriver, transformDrivers } from "../transformers/driver";
import type { SamsaraVehicle } from "../transformers/vehicle";
import { transformVehicle, transformVehicles } from "../transformers/vehicle";

const baseContext: SamsaraTransformContext = {
  connectorId: "conn_samsara_1",
  connectorType: "SAMSARA",
  teamId: "team_1",
  workspaceId: "ws_1",
  organizationId: "org_1",
  organizationName: "Test Fleet Co",
  region: "us",
};

function createMockVehicle(
  overrides?: Partial<SamsaraVehicle>
): SamsaraVehicle {
  return {
    id: "v_100",
    name: "Truck 42",
    vin: "1HGBH41JXMN109186",
    make: "Ford",
    model: "F-150",
    year: 2023,
    licensePlate: "ABC-1234",
    tags: [{ id: "t1", name: "West Region" }],
    gps: {
      latitude: 37.7749,
      longitude: -122.4194,
      speedMilesPerHour: 55,
      headingDegrees: 180,
      reverseGeo: { formattedLocation: "San Francisco, CA" },
    },
    fuelPercent: { value: 72 },
    engineState: { value: "Running" },
    obdOdometerMeters: { value: 160_934 },
    updatedAtTime: "2024-01-15T10:30:00Z",
    ...overrides,
  };
}

function createMockDriver(overrides?: Partial<SamsaraDriver>): SamsaraDriver {
  return {
    id: "d_200",
    name: "Jane Smith",
    phone: "+1-555-0100",
    licenseNumber: "DL123456",
    licenseState: "CA",
    tags: [{ id: "t2", name: "Senior Driver" }],
    updatedAtTime: "2024-01-14T08:00:00Z",
    ...overrides,
  };
}

function createMockAlert(overrides?: Partial<SamsaraAlert>): SamsaraAlert {
  return {
    id: "a_300",
    alertType: "HarshBraking",
    conditionName: "Harsh Braking Detected",
    vehicle: { id: "v_100", name: "Truck 42" },
    driver: { id: "d_200", name: "Jane Smith" },
    occurredAtTime: "2024-01-15T14:22:00Z",
    ...overrides,
  };
}

describe("samsara transformers", () => {
  describe("transformVehicle", () => {
    it("transforms vehicle to GenericDocument", async () => {
      const vehicle = createMockVehicle();
      const doc = await transformVehicle(vehicle, baseContext);

      expect(doc.id).toBe("conn_samsara_1_vehicle_v_100");
      expect(doc.connector_id).toBe("conn_samsara_1");
      expect(doc.connector_type).toBe("SAMSARA");
      expect(doc.team_id).toBe("team_1");
      expect(doc.workspace_id).toBe("ws_1");
      expect(doc.external_id).toBe("v_100");
      expect(doc.document_type).toBe("device");
      expect(doc.document_subtype).toBe("vehicle");
      expect(doc.title).toBe("Truck 42");
      expect(doc.is_public).toBe(false);
      expect(doc.source_type).toBe("samsara");
      expect(doc.source_name).toBe("Test Fleet Co");
    });

    it("builds vehicle content with telemetry data", async () => {
      const doc = await transformVehicle(createMockVehicle(), baseContext);

      expect(doc.content).toContain("2023 Ford F-150");
      expect(doc.content).toContain("VIN: 1HGBH41JXMN109186");
      expect(doc.content).toContain("Plate: ABC-1234");
      expect(doc.content).toContain("Location: San Francisco, CA");
      expect(doc.content).toContain("Engine: Running");
      expect(doc.content).toContain("Fuel: 72%");
      expect(doc.content).toContain("Tags: West Region");
    });

    it("includes GPS metadata", async () => {
      const doc = await transformVehicle(createMockVehicle(), baseContext);

      expect(doc.metadata?.latitude).toBe(37.7749);
      expect(doc.metadata?.longitude).toBe(-122.4194);
      expect(doc.metadata?.speedMph).toBe(55);
      expect(doc.metadata?.headingDegrees).toBe(180);
      expect(doc.metadata?.locationName).toBe("San Francisco, CA");
    });

    it("includes vehicle identification metadata", async () => {
      const doc = await transformVehicle(createMockVehicle(), baseContext);

      expect(doc.metadata?.vin).toBe("1HGBH41JXMN109186");
      expect(doc.metadata?.make).toBe("Ford");
      expect(doc.metadata?.model).toBe("F-150");
      expect(doc.metadata?.year).toBe(2023);
      expect(doc.metadata?.licensePlate).toBe("ABC-1234");
    });

    it("generates deterministic checksums", async () => {
      const vehicle = createMockVehicle();
      const doc1 = await transformVehicle(vehicle, baseContext);
      const doc2 = await transformVehicle(vehicle, baseContext);

      expect(doc1.checksum).toBe(doc2.checksum);
    });

    it("builds URL with organization ID", async () => {
      const doc = await transformVehicle(createMockVehicle(), baseContext);

      expect(doc.url).toBe(
        "https://cloud.samsara.com/o/org_1/fleet/vehicles/v_100"
      );
    });

    it("handles minimal vehicle without optional fields", async () => {
      const vehicle = createMockVehicle({
        vin: undefined,
        make: undefined,
        model: undefined,
        year: undefined,
        gps: undefined,
        fuelPercent: undefined,
        engineState: undefined,
        tags: undefined,
      });

      const doc = await transformVehicle(vehicle, baseContext);

      expect(doc.title).toBe("Truck 42");
      expect(doc.document_type).toBe("device");
      expect(doc.labels).toBeUndefined();
    });

    it("sets labels from tags", async () => {
      const vehicle = createMockVehicle({
        tags: [
          { id: "t1", name: "West Region" },
          { id: "t2", name: "Heavy Duty" },
        ],
      });

      const doc = await transformVehicle(vehicle, baseContext);
      expect(doc.labels).toEqual(["West Region", "Heavy Duty"]);
    });

    it("transforms multiple vehicles", async () => {
      const vehicles = [
        createMockVehicle({ id: "v1", name: "Truck 1" }),
        createMockVehicle({ id: "v2", name: "Truck 2" }),
      ];

      const docs = await transformVehicles(vehicles, baseContext);
      expect(docs).toHaveLength(2);
      expect(docs[0]?.external_id).toBe("v1");
      expect(docs[1]?.external_id).toBe("v2");
    });
  });

  describe("transformDriver", () => {
    it("transforms driver to GenericDocument", async () => {
      const driver = createMockDriver();
      const doc = await transformDriver(driver, baseContext);

      expect(doc.id).toBe("conn_samsara_1_driver_d_200");
      expect(doc.external_id).toBe("d_200");
      expect(doc.document_type).toBe("device");
      expect(doc.document_subtype).toBe("driver");
      expect(doc.title).toBe("Jane Smith");
    });

    it("builds driver content with contact info", async () => {
      const doc = await transformDriver(createMockDriver(), baseContext);

      expect(doc.content).toContain("Phone: +1-555-0100");
      expect(doc.content).toContain("License: DL123456");
      expect(doc.content).toContain("State: CA");
      expect(doc.content).toContain("Tags: Senior Driver");
    });

    it("includes driver metadata", async () => {
      const doc = await transformDriver(createMockDriver(), baseContext);

      expect(doc.metadata?.driverId).toBe("d_200");
      expect(doc.metadata?.phone).toBe("+1-555-0100");
      expect(doc.metadata?.licenseNumber).toBe("DL123456");
      expect(doc.metadata?.licenseState).toBe("CA");
    });

    it("transforms multiple drivers", async () => {
      const drivers = [
        createMockDriver({ id: "d1", name: "Driver A" }),
        createMockDriver({ id: "d2", name: "Driver B" }),
      ];

      const docs = await transformDrivers(drivers, baseContext);
      expect(docs).toHaveLength(2);
    });
  });

  describe("transformAlert", () => {
    it("transforms alert to GenericDocument", async () => {
      const alert = createMockAlert();
      const doc = await transformAlert(alert, baseContext);

      expect(doc.id).toBe("conn_samsara_1_alert_a_300");
      expect(doc.external_id).toBe("a_300");
      expect(doc.document_type).toBe("alert");
      expect(doc.title).toBe("Harsh Braking Detected");
    });

    it("builds alert content with vehicle and driver", async () => {
      const doc = await transformAlert(createMockAlert(), baseContext);

      expect(doc.content).toContain("Harsh Braking Detected");
      expect(doc.content).toContain("Vehicle: Truck 42");
      expect(doc.content).toContain("Driver: Jane Smith");
    });

    it("includes alert metadata", async () => {
      const doc = await transformAlert(createMockAlert(), baseContext);

      expect(doc.metadata?.alertType).toBe("HarshBraking");
      expect(doc.metadata?.vehicleId).toBe("v_100");
      expect(doc.metadata?.vehicleName).toBe("Truck 42");
      expect(doc.metadata?.driverId).toBe("d_200");
      expect(doc.metadata?.driverName).toBe("Jane Smith");
    });

    it("sets resolved_at when alert is resolved", async () => {
      const alert = createMockAlert({
        resolvedAtTime: "2024-01-15T14:30:00Z",
      });

      const doc = await transformAlert(alert, baseContext);
      expect(doc.resolved_at).toBe(new Date("2024-01-15T14:30:00Z").getTime());
    });

    it("handles alert without vehicle or driver", async () => {
      const alert = createMockAlert({
        vehicle: undefined,
        driver: undefined,
      });

      const doc = await transformAlert(alert, baseContext);
      expect(doc.metadata?.vehicleId).toBeUndefined();
      expect(doc.metadata?.driverId).toBeUndefined();
    });

    it("transforms multiple alerts", async () => {
      const alerts = [
        createMockAlert({ id: "a1" }),
        createMockAlert({ id: "a2" }),
      ];

      const docs = await transformAlerts(alerts, baseContext);
      expect(docs).toHaveLength(2);
    });
  });
});
