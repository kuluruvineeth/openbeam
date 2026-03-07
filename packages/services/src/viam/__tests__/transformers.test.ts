import { describe, expect, it } from "bun:test";
import type {
  ViamAggregatedReading,
  ViamCapture,
  ViamComponent,
  ViamLocation,
  ViamMachine,
  ViamMLModel,
  ViamTransformContext,
} from "@openbeam/types/services/connectors/viam";
import { transformCapture, transformCaptures } from "../transformers/capture";
import {
  type ComponentTransformParams,
  transformComponent,
  transformComponents,
} from "../transformers/component";
import {
  transformLocation,
  transformLocations,
} from "../transformers/location";
import {
  type MachineTransformParams,
  transformMachine,
  transformMachines,
} from "../transformers/machine";
import { transformMLModel, transformMLModels } from "../transformers/ml-model";
import {
  transformSensorData,
  transformSensorDataBatch,
} from "../transformers/sensor-data";

const baseContext: ViamTransformContext = {
  connectorId: "conn_viam_1",
  connectorType: "VIAM",
  teamId: "team_1",
  workspaceId: "ws_1",
  organizationId: "org_abc",
  apiKeyId: "key_1",
};

function createMockLocation(overrides?: Partial<ViamLocation>): ViamLocation {
  return {
    id: "loc_1",
    name: "Factory Floor A",
    parentLocationId: "loc_parent",
    address: {
      line1: "200 Industrial Way",
      city: "Detroit",
      state: "MI",
      country: "US",
      lat: 42.3314,
      lng: -83.0458,
    },
    createdOn: "2024-03-01T08:00:00Z",
    robotCount: 5,
    ...overrides,
  };
}

function createMockMachine(overrides?: Partial<ViamMachine>): ViamMachine {
  return {
    id: "machine_1",
    name: "Arm-Unit-7",
    locationId: "loc_1",
    status: "online",
    lastAccess: "2024-03-15T14:30:00Z",
    createdOn: "2024-03-01T10:00:00Z",
    mainPartId: "part_main",
    ...overrides,
  };
}

const machineParams: MachineTransformParams = {
  locationName: "Factory Floor A",
  components: [],
};

const componentParams: ComponentTransformParams = {
  machineId: "machine_1",
  machineName: "Arm-Unit-7",
};

function createMockComponent(
  overrides?: Partial<ViamComponent>
): ViamComponent {
  return {
    name: "gripper-1",
    type: "gripper",
    model: "viam:gripper:v2",
    namespace: "rdk",
    dependsOn: ["arm-1"],
    attributes: { maxForce: 50 },
    ...overrides,
  };
}

function createMockSensorData(
  overrides?: Partial<ViamAggregatedReading>
): ViamAggregatedReading {
  return {
    componentName: "temp-sensor-1",
    machineId: "machine_1",
    startTime: 1_710_500_000_000,
    endTime: 1_710_503_600_000,
    count: 120,
    values: {
      temperature: { min: 20.5, max: 25.3, avg: 22.8, last: 23.1 },
      humidity: { min: 40, max: 65, avg: 52.5, last: 55 },
    },
    ...overrides,
  };
}

function createMockCapture(overrides?: Partial<ViamCapture>): ViamCapture {
  return {
    id: "cap_1",
    componentName: "camera-1",
    machineId: "machine_1",
    mimeType: "image/jpeg",
    timestamp: "2024-03-15T14:00:00Z",
    tags: ["inspection", "quality-check"],
    annotations: { defects: 0 },
    ...overrides,
  };
}

function createMockMLModel(overrides?: Partial<ViamMLModel>): ViamMLModel {
  return {
    id: "model_1",
    name: "defect-detector-v3",
    version: "3.1.0",
    architecture: "yolov8",
    framework: "pytorch",
    createdOn: "2024-02-20T08:00:00Z",
    status: "deployed",
    ...overrides,
  };
}

describe("viam transformers", () => {
  describe("transformLocation", () => {
    it("transforms location to GenericDocument", async () => {
      const doc = await transformLocation(createMockLocation(), baseContext);

      expect(doc.id).toBe("conn_viam_1_location_loc_1");
      expect(doc.connector_id).toBe("conn_viam_1");
      expect(doc.connector_type).toBe("VIAM");
      expect(doc.team_id).toBe("team_1");
      expect(doc.external_id).toBe("loc_1");
      expect(doc.document_type).toBe("robot_location");
      expect(doc.title).toBe("Factory Floor A");
      expect(doc.source_type).toBe("viam");
    });

    it("builds content with robot count and address", async () => {
      const doc = await transformLocation(createMockLocation(), baseContext);

      expect(doc.content).toContain("Robots: 5");
      expect(doc.content).toContain("200 Industrial Way, Detroit, MI, US");
    });

    it("includes location metadata", async () => {
      const doc = await transformLocation(createMockLocation(), baseContext);

      expect(doc.metadata?.locationId).toBe("loc_1");
      expect(doc.metadata?.robotCount).toBe(5);
      expect(doc.metadata?.parentLocationId).toBe("loc_parent");
      expect(doc.metadata?.latitude).toBe(42.3314);
      expect(doc.metadata?.longitude).toBe(-83.0458);
    });

    it("handles location without address", async () => {
      const loc = createMockLocation({
        address: undefined,
        parentLocationId: undefined,
      });
      const doc = await transformLocation(loc, baseContext);

      expect(doc.metadata?.latitude).toBeUndefined();
      expect(doc.metadata?.parentLocationId).toBeUndefined();
    });

    it("generates deterministic checksums", async () => {
      const loc = createMockLocation();
      const doc1 = await transformLocation(loc, baseContext);
      const doc2 = await transformLocation(loc, baseContext);
      expect(doc1.checksum).toBe(doc2.checksum);
    });

    it("transforms multiple locations", async () => {
      const locs = [
        createMockLocation({ id: "l1", name: "Floor A" }),
        createMockLocation({ id: "l2", name: "Floor B" }),
      ];
      const docs = await transformLocations(locs, baseContext);
      expect(docs).toHaveLength(2);
      expect(docs[0]?.external_id).toBe("l1");
      expect(docs[1]?.external_id).toBe("l2");
    });

    it("sets access_control with team ID", async () => {
      const doc = await transformLocation(createMockLocation(), baseContext);
      expect(doc.access_control).toEqual(["team:team_1"]);
    });
  });

  describe("transformMachine", () => {
    it("transforms machine to GenericDocument", async () => {
      const doc = await transformMachine(
        createMockMachine(),
        baseContext,
        machineParams
      );

      expect(doc.id).toBe("conn_viam_1_machine_machine_1");
      expect(doc.document_type).toBe("robot_machine");
      expect(doc.title).toBe("Arm-Unit-7");
      expect(doc.status).toBe("online");
    });

    it("builds content with status and location", async () => {
      const doc = await transformMachine(
        createMockMachine(),
        baseContext,
        machineParams
      );

      expect(doc.content).toContain("Status: online");
      expect(doc.content).toContain("Location: Factory Floor A");
    });

    it("includes machine metadata", async () => {
      const doc = await transformMachine(
        createMockMachine(),
        baseContext,
        machineParams
      );

      expect(doc.metadata?.machineId).toBe("machine_1");
      expect(doc.metadata?.locationId).toBe("loc_1");
      expect(doc.metadata?.status).toBe("online");
      expect(doc.metadata?.mainPartId).toBe("part_main");
    });

    it("includes component count when components provided", async () => {
      const params: MachineTransformParams = {
        locationName: "Floor A",
        components: [
          createMockComponent(),
          createMockComponent({ name: "arm-1", type: "arm" }),
        ],
      };

      const doc = await transformMachine(
        createMockMachine(),
        baseContext,
        params
      );

      expect(doc.content).toContain("Components: 2");
      expect(doc.content).toContain("Component types: gripper, arm");
      expect(doc.metadata?.componentCount).toBe(2);
    });

    it("parses timestamps correctly", async () => {
      const doc = await transformMachine(
        createMockMachine(),
        baseContext,
        machineParams
      );

      expect(doc.created_at).toBe(new Date("2024-03-01T10:00:00Z").getTime());
      expect(doc.updated_at).toBe(new Date("2024-03-15T14:30:00Z").getTime());
    });

    it("transforms multiple machines", async () => {
      const machines = [
        createMockMachine({ id: "m1", name: "Machine A" }),
        createMockMachine({ id: "m2", name: "Machine B" }),
      ];
      const docs = await transformMachines(
        machines,
        baseContext,
        machineParams
      );
      expect(docs).toHaveLength(2);
    });
  });

  describe("transformComponent", () => {
    it("transforms component to GenericDocument", async () => {
      const doc = await transformComponent(
        createMockComponent(),
        baseContext,
        componentParams
      );

      expect(doc.id).toBe("conn_viam_1_component_machine_1_gripper-1");
      expect(doc.document_type).toBe("robot_component");
      expect(doc.document_subtype).toBe("gripper");
      expect(doc.title).toBe("gripper-1");
    });

    it("sets parent_id to machine document", async () => {
      const doc = await transformComponent(
        createMockComponent(),
        baseContext,
        componentParams
      );
      expect(doc.parent_id).toBe("conn_viam_1_machine_machine_1");
    });

    it("builds content with type and model", async () => {
      const doc = await transformComponent(
        createMockComponent(),
        baseContext,
        componentParams
      );

      expect(doc.content).toContain("Type: gripper");
      expect(doc.content).toContain("Model: viam:gripper:v2");
      expect(doc.content).toContain("Namespace: rdk");
      expect(doc.content).toContain("Machine: Arm-Unit-7");
      expect(doc.content).toContain("Depends on: arm-1");
    });

    it("includes component metadata", async () => {
      const doc = await transformComponent(
        createMockComponent(),
        baseContext,
        componentParams
      );

      expect(doc.metadata?.componentType).toBe("gripper");
      expect(doc.metadata?.model).toBe("viam:gripper:v2");
      expect(doc.metadata?.machineId).toBe("machine_1");
      expect(doc.metadata?.dependsOn).toEqual(["arm-1"]);
    });

    it("handles component without dependencies", async () => {
      const comp = createMockComponent({ dependsOn: undefined });
      const doc = await transformComponent(comp, baseContext, componentParams);
      expect(doc.metadata?.dependsOn).toBeUndefined();
    });

    it("transforms multiple components", async () => {
      const comps = [
        createMockComponent({ name: "c1" }),
        createMockComponent({ name: "c2" }),
      ];
      const docs = await transformComponents(
        comps,
        baseContext,
        componentParams
      );
      expect(docs).toHaveLength(2);
    });
  });

  describe("transformSensorData", () => {
    it("transforms aggregated reading to GenericDocument", async () => {
      const doc = await transformSensorData(
        createMockSensorData(),
        baseContext
      );

      expect(doc.id).toContain("conn_viam_1_sensor_machine_1_temp-sensor-1");
      expect(doc.document_type).toBe("robot_sensor_data");
      expect(doc.title).toBe("temp-sensor-1 readings");
    });

    it("builds content with statistics", async () => {
      const doc = await transformSensorData(
        createMockSensorData(),
        baseContext
      );

      expect(doc.content).toContain("Component: temp-sensor-1");
      expect(doc.content).toContain("Samples: 120");
      expect(doc.content).toContain(
        "temperature: min=20.5, max=25.3, avg=22.80"
      );
      expect(doc.content).toContain("humidity: min=40, max=65, avg=52.50");
    });

    it("includes sensor data metadata", async () => {
      const doc = await transformSensorData(
        createMockSensorData(),
        baseContext
      );

      expect(doc.metadata?.componentName).toBe("temp-sensor-1");
      expect(doc.metadata?.machineId).toBe("machine_1");
      expect(doc.metadata?.sampleCount).toBe(120);
      expect(doc.metadata?.measurementKeys).toEqual([
        "temperature",
        "humidity",
      ]);
    });

    it("sets timestamps from time window", async () => {
      const doc = await transformSensorData(
        createMockSensorData(),
        baseContext
      );
      expect(doc.created_at).toBe(1_710_500_000_000);
      expect(doc.updated_at).toBe(1_710_503_600_000);
    });

    it("generates deterministic checksums", async () => {
      const reading = createMockSensorData();
      const doc1 = await transformSensorData(reading, baseContext);
      const doc2 = await transformSensorData(reading, baseContext);
      expect(doc1.checksum).toBe(doc2.checksum);
    });

    it("transforms batch of sensor data", async () => {
      const readings = [
        createMockSensorData({ componentName: "s1" }),
        createMockSensorData({ componentName: "s2" }),
      ];
      const docs = await transformSensorDataBatch(readings, baseContext);
      expect(docs).toHaveLength(2);
    });
  });

  describe("transformCapture", () => {
    it("transforms capture to GenericDocument", async () => {
      const doc = await transformCapture(createMockCapture(), baseContext);

      expect(doc.id).toBe("conn_viam_1_capture_cap_1");
      expect(doc.document_type).toBe("robot_capture");
      expect(doc.title).toBe("Capture: camera-1");
      expect(doc.mime_type).toBe("image/jpeg");
    });

    it("builds content with capture details", async () => {
      const doc = await transformCapture(createMockCapture(), baseContext);

      expect(doc.content).toContain("Component: camera-1");
      expect(doc.content).toContain("Type: image/jpeg");
      expect(doc.content).toContain("Tags: inspection, quality-check");
    });

    it("sets labels from tags", async () => {
      const doc = await transformCapture(createMockCapture(), baseContext);
      expect(doc.labels).toEqual(["inspection", "quality-check"]);
    });

    it("handles capture without tags", async () => {
      const cap = createMockCapture({ tags: [] });
      const doc = await transformCapture(cap, baseContext);
      expect(doc.labels).toBeUndefined();
    });

    it("includes capture metadata", async () => {
      const doc = await transformCapture(createMockCapture(), baseContext);

      expect(doc.metadata?.captureId).toBe("cap_1");
      expect(doc.metadata?.componentName).toBe("camera-1");
      expect(doc.metadata?.mimeType).toBe("image/jpeg");
      expect(doc.metadata?.hasAnnotations).toBe(true);
    });

    it("transforms multiple captures", async () => {
      const caps = [
        createMockCapture({ id: "c1" }),
        createMockCapture({ id: "c2" }),
      ];
      const docs = await transformCaptures(caps, baseContext);
      expect(docs).toHaveLength(2);
    });
  });

  describe("transformMLModel", () => {
    it("transforms ML model to GenericDocument", async () => {
      const doc = await transformMLModel(createMockMLModel(), baseContext);

      expect(doc.id).toBe("conn_viam_1_mlmodel_model_1");
      expect(doc.document_type).toBe("robot_ml_model");
      expect(doc.title).toBe("defect-detector-v3");
      expect(doc.version).toBe("3.1.0");
    });

    it("builds content with architecture details", async () => {
      const doc = await transformMLModel(createMockMLModel(), baseContext);

      expect(doc.content).toContain("Architecture: yolov8");
      expect(doc.content).toContain("Framework: pytorch");
      expect(doc.content).toContain("Version: 3.1.0");
      expect(doc.content).toContain("Status: deployed");
    });

    it("includes ML model metadata", async () => {
      const doc = await transformMLModel(createMockMLModel(), baseContext);

      expect(doc.metadata?.modelId).toBe("model_1");
      expect(doc.metadata?.architecture).toBe("yolov8");
      expect(doc.metadata?.framework).toBe("pytorch");
      expect(doc.metadata?.status).toBe("deployed");
    });

    it("generates deterministic checksums", async () => {
      const model = createMockMLModel();
      const doc1 = await transformMLModel(model, baseContext);
      const doc2 = await transformMLModel(model, baseContext);
      expect(doc1.checksum).toBe(doc2.checksum);
    });

    it("transforms multiple ML models", async () => {
      const models = [
        createMockMLModel({ id: "m1", name: "Model A" }),
        createMockMLModel({ id: "m2", name: "Model B" }),
      ];
      const docs = await transformMLModels(models, baseContext);
      expect(docs).toHaveLength(2);
    });
  });
});
