import type { HaystackTransformContext } from "@openbeam/types/services/connectors/haystack";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { HaystackLocation } from "../api/locations";

function buildLocationContent(location: HaystackLocation): string {
  const parts: string[] = [];

  parts.push(location.name);

  if (location.address) {
    parts.push(`Address: ${location.address}`);
  }

  const addressParts: string[] = [];
  if (location.city) {
    addressParts.push(location.city);
  }
  if (location.state) {
    addressParts.push(location.state);
  }
  if (location.country) {
    addressParts.push(location.country);
  }
  if (location.zip_code) {
    addressParts.push(location.zip_code);
  }
  if (addressParts.length > 0) {
    parts.push(addressParts.join(", "));
  }

  if (location.timezone) {
    parts.push(`Timezone: ${location.timezone}`);
  }

  if (location.phone) {
    parts.push(`Phone: ${location.phone}`);
  }

  if (location.capacity) {
    parts.push(`Capacity: ${location.capacity}`);
  }

  return parts.join("\n");
}

export async function transformLocation(
  location: HaystackLocation,
  context: HaystackTransformContext
): Promise<GenericDocument> {
  const title = location.name;
  const content = buildLocationContent(location);
  const metadata: GenericDocument["metadata"] = {
    ...(location.city && { city: location.city }),
    ...(location.state && { state: location.state }),
    ...(location.country && { country: location.country }),
    ...(location.timezone && { timezone: location.timezone }),
    ...(location.address && { address: location.address }),
    ...(location.capacity && { capacity: String(location.capacity) }),
  };

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
    document_type: "location",
    title,
    content,
    created_at: new Date(location.created_at).getTime(),
    updated_at: new Date(location.updated_at).getTime(),
    source_type: "haystack",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
