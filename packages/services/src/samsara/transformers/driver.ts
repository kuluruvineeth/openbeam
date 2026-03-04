import type { SamsaraTransformContext } from "@openplane/types/services/connectors/samsara";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface SamsaraDriver {
  id: string;
  name: string;
  phone?: string;
  licenseNumber?: string;
  licenseState?: string;
  tags?: { id: string; name: string }[];
  updatedAtTime?: string;
}

function buildDriverContent(driver: SamsaraDriver): string {
  const parts: string[] = [];

  if (driver.phone) {
    parts.push(`Phone: ${driver.phone}`);
  }
  if (driver.licenseNumber) {
    parts.push(`License: ${driver.licenseNumber}`);
  }
  if (driver.licenseState) {
    parts.push(`State: ${driver.licenseState}`);
  }
  if (driver.tags?.length) {
    parts.push(`Tags: ${driver.tags.map((t) => t.name).join(", ")}`);
  }

  return parts.join("\n");
}

function buildDriverMetadata(
  driver: SamsaraDriver
): GenericDocument["metadata"] {
  return {
    driverId: driver.id,
    ...(driver.phone && { phone: driver.phone }),
    ...(driver.licenseNumber && { licenseNumber: driver.licenseNumber }),
    ...(driver.licenseState && { licenseState: driver.licenseState }),
  };
}

export async function transformDriver(
  driver: SamsaraDriver,
  context: SamsaraTransformContext
): Promise<GenericDocument> {
  const title = driver.name;
  const content = buildDriverContent(driver);
  const metadata = buildDriverMetadata(driver);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();
  const updatedAt = driver.updatedAtTime
    ? new Date(driver.updatedAtTime).getTime()
    : now;

  return {
    id: `${context.connectorId}_driver_${driver.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: driver.id,
    document_type: "device",
    document_subtype: "driver",
    title,
    content,
    created_at: updatedAt,
    updated_at: updatedAt,
    source_type: "samsara",
    source_name: context.organizationName,
    labels: driver.tags?.map((t) => t.name),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformDrivers(
  drivers: SamsaraDriver[],
  context: SamsaraTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(drivers.map((driver) => transformDriver(driver, context)));
}
