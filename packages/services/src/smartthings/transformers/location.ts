import type { SmartThingsTransformContext } from "@openbeam/types/services/connectors/smartthings";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { SmartThingsLocation, SmartThingsRoom } from "../client";

function buildLocationContent(
  location: SmartThingsLocation,
  rooms: SmartThingsRoom[]
): string {
  const parts: string[] = [];

  if (location.countryCode) {
    parts.push(`Country: ${location.countryCode}`);
  }

  if (location.timeZoneId) {
    parts.push(`Timezone: ${location.timeZoneId}`);
  }

  if (location.temperatureScale) {
    parts.push(`Temperature Scale: ${location.temperatureScale}`);
  }

  if (location.latitude != null && location.longitude != null) {
    parts.push(`Coordinates: ${location.latitude}, ${location.longitude}`);
  }

  if (rooms.length > 0) {
    parts.push(`Rooms: ${rooms.map((r) => r.name).join(", ")}`);
  }

  return parts.join("\n");
}

function buildLocationMetadata(
  location: SmartThingsLocation,
  rooms: SmartThingsRoom[]
): GenericDocument["metadata"] {
  return {
    locationId: location.locationId,
    ...(location.countryCode && { countryCode: location.countryCode }),
    ...(location.timeZoneId && { timeZoneId: location.timeZoneId }),
    ...(location.temperatureScale && {
      temperatureScale: location.temperatureScale,
    }),
    ...(location.locale && { locale: location.locale }),
    ...(rooms.length > 0 && { roomCount: rooms.length }),
    ...(rooms.length > 0 && {
      rooms: JSON.stringify(rooms.map((r) => r.name)),
    }),
  };
}

export async function transformLocation(
  location: SmartThingsLocation,
  context: SmartThingsTransformContext,
  rooms: SmartThingsRoom[] = []
): Promise<GenericDocument> {
  const title = location.name;
  const content = buildLocationContent(location, rooms);
  const metadata = buildLocationMetadata(location, rooms);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const updatedAt = location.lastModified
    ? new Date(location.lastModified).getTime()
    : Date.now();
  const createdAt = location.created
    ? new Date(location.created).getTime()
    : updatedAt;

  return {
    id: `${context.connectorId}_location_${location.locationId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: location.locationId,
    document_type: "location",
    document_subtype: "iot_location",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "smartthings",
    source_name: "SmartThings",
    url: `https://my.smartthings.com/locations/${location.locationId}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformLocations(
  locations: SmartThingsLocation[],
  context: SmartThingsTransformContext,
  roomsByLocation: Map<string, SmartThingsRoom[]> = new Map()
): Promise<GenericDocument[]> {
  return Promise.all(
    locations.map((loc) =>
      transformLocation(loc, context, roomsByLocation.get(loc.locationId) ?? [])
    )
  );
}
