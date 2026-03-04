import type {
  ViamLocation,
  ViamTransformContext,
} from "@openplane/types/services/connectors/viam";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildLocationContent(location: ViamLocation): string {
  const parts: string[] = [];

  parts.push(`Robots: ${location.robotCount}`);

  if (location.address) {
    const addr = [
      location.address.line1,
      location.address.city,
      location.address.state,
      location.address.country,
    ]
      .filter(Boolean)
      .join(", ");
    if (addr) {
      parts.push(`Address: ${addr}`);
    }
  }

  if (location.parentLocationId) {
    parts.push(`Parent: ${location.parentLocationId}`);
  }

  return parts.join("\n");
}

function buildLocationMetadata(
  location: ViamLocation
): GenericDocument["metadata"] {
  return {
    locationId: location.id,
    robotCount: location.robotCount,
    ...(location.parentLocationId && {
      parentLocationId: location.parentLocationId,
    }),
    ...(location.address?.lat != null && { latitude: location.address.lat }),
    ...(location.address?.lng != null && { longitude: location.address.lng }),
  };
}

export async function transformLocation(
  location: ViamLocation,
  context: ViamTransformContext
): Promise<GenericDocument> {
  const title = location.name;
  const content = buildLocationContent(location);
  const metadata = buildLocationMetadata(location);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_location_${location.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: location.id,
    document_type: "robot_location",
    title,
    content,
    created_at: new Date(location.createdOn).getTime(),
    updated_at: new Date(location.createdOn).getTime(),
    source_type: "viam",
    url: `https://app.viam.com/locations/${location.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformLocations(
  locations: ViamLocation[],
  context: ViamTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(locations.map((loc) => transformLocation(loc, context)));
}
