import { describe, expect, it } from "bun:test";
import type { AwsIotTransformContext } from "@openplane/types/services/connectors/aws-iot";
import type {
  AwsIotShadow,
  AwsIotThingDetail,
  AwsIotThingGroupDetail,
} from "../client";
import type { ThingWithShadow } from "../transformers/thing";
import { transformThing, transformThings } from "../transformers/thing";
import {
  transformThingGroup,
  transformThingGroups,
} from "../transformers/thing-group";

const baseContext: AwsIotTransformContext = {
  connectorId: "conn_aws_iot_1",
  connectorType: "AWS_IOT_CORE",
  teamId: "team_1",
  workspaceId: "ws_1",
  region: "us-east-1",
  accountId: "123456789012",
};

function createMockThing(
  overrides?: Partial<AwsIotThingDetail>
): AwsIotThingDetail {
  return {
    thingName: "temperature-sensor-01",
    thingArn: "arn:aws:iot:us-east-1:123456789012:thing/temperature-sensor-01",
    thingTypeName: "TemperatureSensor",
    thingId: "thing-id-abc",
    attributes: {
      location: "Building A",
      floor: "3",
      model: "TH-200",
    },
    version: 5,
    defaultClientId: "temperature-sensor-01",
    ...overrides,
  };
}

function createMockShadow(overrides?: Partial<AwsIotShadow>): AwsIotShadow {
  return {
    state: {
      reported: {
        temperature: 22.5,
        humidity: 48,
        battery: 85,
        firmware: "2.1.0",
      },
      desired: {
        reportingInterval: 60,
      },
    },
    version: 12,
    timestamp: 1_700_000_000,
    ...overrides,
  };
}

function createMockThingGroup(
  overrides?: Partial<AwsIotThingGroupDetail>
): AwsIotThingGroupDetail {
  return {
    groupName: "building-a-sensors",
    groupArn:
      "arn:aws:iot:us-east-1:123456789012:thinggroup/building-a-sensors",
    groupId: "group-id-xyz",
    version: 3,
    description: "All sensors in Building A",
    parentGroupName: "all-sensors",
    rootToParentGroups: [
      {
        groupName: "all-sensors",
        groupArn: "arn:aws:iot:us-east-1:123456789012:thinggroup/all-sensors",
      },
    ],
    attributes: { building: "A", zone: "production" },
    creationDate: 1_690_000_000,
    ...overrides,
  };
}

describe("aws-iot transformers", () => {
  describe("transformThing", () => {
    it("transforms thing with shadow to GenericDocument", async () => {
      const data: ThingWithShadow = {
        thing: createMockThing(),
        shadow: createMockShadow(),
      };
      const doc = await transformThing(data, baseContext);

      expect(doc.id).toBe("conn_aws_iot_1_thing_temperature-sensor-01");
      expect(doc.connector_id).toBe("conn_aws_iot_1");
      expect(doc.connector_type).toBe("AWS_IOT_CORE");
      expect(doc.team_id).toBe("team_1");
      expect(doc.workspace_id).toBe("ws_1");
      expect(doc.external_id).toBe("temperature-sensor-01");
      expect(doc.document_type).toBe("device");
      expect(doc.document_subtype).toBe("thing");
      expect(doc.title).toBe("temperature-sensor-01");
      expect(doc.is_public).toBe(false);
      expect(doc.source_type).toBe("aws-iot");
    });

    it("builds content from thing attributes and shadow state", async () => {
      const data: ThingWithShadow = {
        thing: createMockThing(),
        shadow: createMockShadow(),
      };
      const doc = await transformThing(data, baseContext);

      expect(doc.content).toContain("Type: TemperatureSensor");
      expect(doc.content).toContain("location: Building A");
      expect(doc.content).toContain("floor: 3");
      expect(doc.content).toContain("Reported State:");
      expect(doc.content).toContain("temperature: 22.5");
      expect(doc.content).toContain("Desired State:");
      expect(doc.content).toContain("reportingInterval: 60");
    });

    it("includes shadow data in metadata", async () => {
      const data: ThingWithShadow = {
        thing: createMockThing(),
        shadow: createMockShadow(),
      };
      const doc = await transformThing(data, baseContext);

      expect(doc.metadata?.thingName).toBe("temperature-sensor-01");
      expect(doc.metadata?.thingId).toBe("thing-id-abc");
      expect(doc.metadata?.thingType).toBe("TemperatureSensor");
      expect(doc.metadata?.shadowVersion).toBe(12);
      expect(doc.metadata?.shadowReported).toBe(
        JSON.stringify({
          temperature: 22.5,
          humidity: 48,
          battery: 85,
          firmware: "2.1.0",
        })
      );
      expect(doc.metadata?.shadowDesired).toBe(
        JSON.stringify({ reportingInterval: 60 })
      );
    });

    it("handles thing without shadow", async () => {
      const data: ThingWithShadow = {
        thing: createMockThing(),
        shadow: null,
      };
      const doc = await transformThing(data, baseContext);

      expect(doc.title).toBe("temperature-sensor-01");
      expect(doc.document_type).toBe("device");
      expect(doc.metadata?.shadowReported).toBeUndefined();
      expect(doc.metadata?.shadowDesired).toBeUndefined();
    });

    it("handles minimal thing without optional fields", async () => {
      const data: ThingWithShadow = {
        thing: {
          thingName: "basic-device",
          thingArn: "arn:aws:iot:us-east-1:123:thing/basic-device",
        },
        shadow: null,
      };
      const doc = await transformThing(data, baseContext);

      expect(doc.title).toBe("basic-device");
      expect(doc.external_id).toBe("basic-device");
      expect(doc.content).toBe("");
    });

    it("generates deterministic checksums", async () => {
      const data: ThingWithShadow = {
        thing: createMockThing(),
        shadow: createMockShadow(),
      };
      const doc1 = await transformThing(data, baseContext);
      const doc2 = await transformThing(data, baseContext);

      expect(doc1.checksum).toBe(doc2.checksum);
    });

    it("uses shadow timestamp for updated_at", async () => {
      const data: ThingWithShadow = {
        thing: createMockThing(),
        shadow: createMockShadow({ timestamp: 1_700_000_000 }),
      };
      const doc = await transformThing(data, baseContext);

      expect(doc.updated_at).toBe(1_700_000_000 * 1000);
    });

    it("builds AWS console URL with region", async () => {
      const data: ThingWithShadow = {
        thing: createMockThing(),
        shadow: null,
      };
      const doc = await transformThing(data, baseContext);

      expect(doc.url).toContain("us-east-1.console.aws.amazon.com");
      expect(doc.url).toContain("temperature-sensor-01");
    });

    it("includes access control", async () => {
      const data: ThingWithShadow = {
        thing: createMockThing(),
        shadow: null,
      };
      const doc = await transformThing(data, baseContext);

      expect(doc.access_control).toEqual(["team:team_1"]);
    });

    it("transforms multiple things", async () => {
      const items: ThingWithShadow[] = [
        { thing: createMockThing({ thingName: "device-1" }), shadow: null },
        { thing: createMockThing({ thingName: "device-2" }), shadow: null },
        { thing: createMockThing({ thingName: "device-3" }), shadow: null },
      ];

      const docs = await transformThings(items, baseContext);
      expect(docs).toHaveLength(3);
      expect(docs[0]?.external_id).toBe("device-1");
      expect(docs[1]?.external_id).toBe("device-2");
      expect(docs[2]?.external_id).toBe("device-3");
    });
  });

  describe("transformThingGroup", () => {
    it("transforms thing group to GenericDocument", async () => {
      const group = createMockThingGroup();
      const doc = await transformThingGroup(group, baseContext);

      expect(doc.id).toBe("conn_aws_iot_1_thinggroup_building-a-sensors");
      expect(doc.external_id).toBe("building-a-sensors");
      expect(doc.document_type).toBe("device_group");
      expect(doc.document_subtype).toBe("thing_group");
      expect(doc.title).toBe("building-a-sensors");
      expect(doc.source_type).toBe("aws-iot");
    });

    it("builds content with description and hierarchy", async () => {
      const doc = await transformThingGroup(
        createMockThingGroup(),
        baseContext
      );

      expect(doc.content).toContain("All sensors in Building A");
      expect(doc.content).toContain("Parent: all-sensors");
      expect(doc.content).toContain("Hierarchy: all-sensors");
      expect(doc.content).toContain("building: A");
    });

    it("includes group metadata", async () => {
      const doc = await transformThingGroup(
        createMockThingGroup(),
        baseContext
      );

      expect(doc.metadata?.groupName).toBe("building-a-sensors");
      expect(doc.metadata?.groupId).toBe("group-id-xyz");
      expect(doc.metadata?.version).toBe(3);
      expect(doc.metadata?.description).toBe("All sensors in Building A");
      expect(doc.metadata?.parentGroup).toBe("all-sensors");
      expect(doc.metadata?.hierarchyDepth).toBe(1);
    });

    it("uses creation date for timestamps", async () => {
      const doc = await transformThingGroup(
        createMockThingGroup({ creationDate: 1_690_000_000 }),
        baseContext
      );

      expect(doc.created_at).toBe(1_690_000_000 * 1000);
    });

    it("handles minimal group without optional fields", async () => {
      const group: AwsIotThingGroupDetail = {
        groupName: "simple-group",
        groupArn: "arn:aws:iot:us-east-1:123:thinggroup/simple-group",
      };
      const doc = await transformThingGroup(group, baseContext);

      expect(doc.title).toBe("simple-group");
      expect(doc.content).toBe("");
    });

    it("generates deterministic checksums", async () => {
      const group = createMockThingGroup();
      const doc1 = await transformThingGroup(group, baseContext);
      const doc2 = await transformThingGroup(group, baseContext);

      expect(doc1.checksum).toBe(doc2.checksum);
    });

    it("builds AWS console URL for thing group", async () => {
      const doc = await transformThingGroup(
        createMockThingGroup(),
        baseContext
      );

      expect(doc.url).toContain("us-east-1.console.aws.amazon.com");
      expect(doc.url).toContain("thinggroup");
      expect(doc.url).toContain("building-a-sensors");
    });

    it("transforms multiple thing groups", async () => {
      const groups = [
        createMockThingGroup({ groupName: "group-1" }),
        createMockThingGroup({ groupName: "group-2" }),
      ];

      const docs = await transformThingGroups(groups, baseContext);
      expect(docs).toHaveLength(2);
      expect(docs[0]?.external_id).toBe("group-1");
      expect(docs[1]?.external_id).toBe("group-2");
    });
  });
});
