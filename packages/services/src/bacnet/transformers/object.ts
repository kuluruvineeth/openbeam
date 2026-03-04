import type {
  BacnetObject,
  BacnetObjectType,
  BacnetTransformContext,
} from "@openplane/types/services/connectors/bacnet";
import { BacnetObjectType as ObjectTypes } from "@openplane/types/services/connectors/bacnet";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

const OBJECT_TYPE_NAMES: Record<number, string> = {
  [ObjectTypes.ANALOG_INPUT]: "Analog Input",
  [ObjectTypes.ANALOG_OUTPUT]: "Analog Output",
  [ObjectTypes.ANALOG_VALUE]: "Analog Value",
  [ObjectTypes.BINARY_INPUT]: "Binary Input",
  [ObjectTypes.BINARY_OUTPUT]: "Binary Output",
  [ObjectTypes.BINARY_VALUE]: "Binary Value",
  [ObjectTypes.CALENDAR]: "Calendar",
  [ObjectTypes.COMMAND]: "Command",
  [ObjectTypes.DEVICE]: "Device",
  [ObjectTypes.EVENT_ENROLLMENT]: "Event Enrollment",
  [ObjectTypes.FILE]: "File",
  [ObjectTypes.GROUP]: "Group",
  [ObjectTypes.LOOP]: "Loop",
  [ObjectTypes.MULTI_STATE_INPUT]: "Multi-State Input",
  [ObjectTypes.MULTI_STATE_OUTPUT]: "Multi-State Output",
  [ObjectTypes.NOTIFICATION_CLASS]: "Notification Class",
  [ObjectTypes.PROGRAM]: "Program",
  [ObjectTypes.SCHEDULE]: "Schedule",
  [ObjectTypes.AVERAGING]: "Averaging",
  [ObjectTypes.MULTI_STATE_VALUE]: "Multi-State Value",
  [ObjectTypes.TREND_LOG]: "Trend Log",
};

const SENSOR_READING_TYPES = new Set<BacnetObjectType>([
  ObjectTypes.ANALOG_INPUT,
  ObjectTypes.ANALOG_OUTPUT,
  ObjectTypes.ANALOG_VALUE,
  ObjectTypes.BINARY_INPUT,
  ObjectTypes.BINARY_OUTPUT,
  ObjectTypes.BINARY_VALUE,
  ObjectTypes.MULTI_STATE_INPUT,
  ObjectTypes.MULTI_STATE_OUTPUT,
  ObjectTypes.MULTI_STATE_VALUE,
]);

function getObjectTypeName(type: number): string {
  return OBJECT_TYPE_NAMES[type] ?? `Object Type ${type}`;
}

function getDocumentType(objectType: number): string {
  return SENSOR_READING_TYPES.has(objectType as BacnetObjectType)
    ? "sensor_reading"
    : "device_config";
}

function buildObjectContent(object: BacnetObject): string {
  const parts: string[] = [];

  if (object.objectName) {
    parts.push(`Name: ${object.objectName}`);
  }

  parts.push(`Type: ${getObjectTypeName(object.type)}`);

  if (object.description) {
    parts.push(`Description: ${object.description}`);
  }

  if (object.presentValue != null) {
    parts.push(`Present Value: ${String(object.presentValue)}`);
  }

  if (object.units != null) {
    parts.push(`Units: ${object.units}`);
  }

  if (object.statusFlags != null) {
    parts.push(`Status Flags: ${object.statusFlags}`);
  }

  if (object.activeText) {
    parts.push(`Active Text: ${object.activeText}`);
  }

  if (object.inactiveText) {
    parts.push(`Inactive Text: ${object.inactiveText}`);
  }

  if (object.stateText && object.stateText.length > 0) {
    parts.push(`State Text: ${object.stateText.join(", ")}`);
  }

  return parts.join("\n");
}

function buildObjectMetadata(
  object: BacnetObject,
  deviceId: number
): GenericDocument["metadata"] {
  return {
    objectType: object.type,
    objectTypeName: getObjectTypeName(object.type),
    objectInstance: object.instance,
    deviceId,
    ...(object.presentValue != null && {
      presentValue: String(object.presentValue),
    }),
    ...(object.units != null && { units: object.units }),
    ...(object.description && { description: object.description }),
    ...(object.statusFlags != null && { statusFlags: object.statusFlags }),
    ...(object.covIncrement != null && { covIncrement: object.covIncrement }),
    ...(object.activeText && { activeText: object.activeText }),
    ...(object.inactiveText && { inactiveText: object.inactiveText }),
    ...(object.numberOfStates != null && {
      numberOfStates: object.numberOfStates,
    }),
    ...(object.stateText &&
      object.stateText.length > 0 && {
        stateText: JSON.stringify(object.stateText),
      }),
  };
}

interface TransformObjectParams {
  object: BacnetObject;
  deviceId: number;
  context: BacnetTransformContext;
}

export async function transformObject(
  params: TransformObjectParams
): Promise<GenericDocument> {
  const { object, deviceId, context } = params;
  const objectTypeName = getObjectTypeName(object.type);
  const title = object.objectName ?? `${objectTypeName} ${object.instance}`;
  const content = buildObjectContent(object);
  const metadata = buildObjectMetadata(object, deviceId);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();

  return {
    id: `${context.connectorId}_object_${deviceId}_${object.type}_${object.instance}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: `${deviceId}_${object.type}_${object.instance}`,
    document_type: getDocumentType(object.type),
    document_subtype: objectTypeName.toLowerCase().replace(/\s+/g, "_"),
    title,
    content,
    created_at: now,
    updated_at: now,
    source_type: "bacnet",
    source_name: "BACnet",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    ...(context.siteName && { source_path: context.siteName }),
  };
}

interface TransformObjectsParams {
  objects: BacnetObject[];
  deviceId: number;
  context: BacnetTransformContext;
}

export function transformObjects(
  params: TransformObjectsParams
): Promise<GenericDocument[]> {
  const { objects, deviceId, context } = params;
  return Promise.all(
    objects.map((object) => transformObject({ object, deviceId, context }))
  );
}
