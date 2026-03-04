import type { SamsaraTransformContext } from "@openplane/types/services/connectors/samsara";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface SamsaraVehicle {
  id: string;
  name: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  licensePlate?: string;
  serial?: string;
  externalIds?: Record<string, string>;
  tags?: { id: string; name: string }[];
  gps?: {
    latitude: number;
    longitude: number;
    speedMilesPerHour?: number;
    headingDegrees?: number;
    reverseGeo?: { formattedLocation?: string };
  };
  fuelPercent?: { value?: number };
  engineState?: { value?: string };
  obdOdometerMeters?: { value?: number };
  updatedAtTime?: string;
}

function buildVehicleContent(vehicle: SamsaraVehicle): string {
  const parts: string[] = [];

  if (vehicle.make || vehicle.model || vehicle.year) {
    parts.push(
      [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")
    );
  }

  if (vehicle.vin) {
    parts.push(`VIN: ${vehicle.vin}`);
  }
  if (vehicle.licensePlate) {
    parts.push(`Plate: ${vehicle.licensePlate}`);
  }
  if (vehicle.serial) {
    parts.push(`Serial: ${vehicle.serial}`);
  }

  if (vehicle.gps?.reverseGeo?.formattedLocation) {
    parts.push(`Location: ${vehicle.gps.reverseGeo.formattedLocation}`);
  }

  if (vehicle.engineState?.value) {
    parts.push(`Engine: ${vehicle.engineState.value}`);
  }

  if (vehicle.fuelPercent?.value != null) {
    parts.push(`Fuel: ${vehicle.fuelPercent.value}%`);
  }

  if (vehicle.obdOdometerMeters?.value != null) {
    const miles = Math.round(vehicle.obdOdometerMeters.value * 0.000_621_371);
    parts.push(`Odometer: ${miles} mi`);
  }

  if (vehicle.tags?.length) {
    parts.push(`Tags: ${vehicle.tags.map((t) => t.name).join(", ")}`);
  }

  return parts.join("\n");
}

function buildVehicleMetadata(
  vehicle: SamsaraVehicle
): GenericDocument["metadata"] {
  return {
    vehicleId: vehicle.id,
    ...(vehicle.vin && { vin: vehicle.vin }),
    ...(vehicle.make && { make: vehicle.make }),
    ...(vehicle.model && { model: vehicle.model }),
    ...(vehicle.year && { year: vehicle.year }),
    ...(vehicle.licensePlate && { licensePlate: vehicle.licensePlate }),
    ...(vehicle.serial && { serial: vehicle.serial }),
    ...(vehicle.externalIds && { externalIds: vehicle.externalIds }),
    ...(vehicle.gps && {
      latitude: vehicle.gps.latitude,
      longitude: vehicle.gps.longitude,
      ...(vehicle.gps.speedMilesPerHour != null && {
        speedMph: vehicle.gps.speedMilesPerHour,
      }),
      ...(vehicle.gps.headingDegrees != null && {
        headingDegrees: vehicle.gps.headingDegrees,
      }),
      ...(vehicle.gps.reverseGeo?.formattedLocation && {
        locationName: vehicle.gps.reverseGeo.formattedLocation,
      }),
    }),
    ...(vehicle.fuelPercent?.value != null && {
      fuelPercent: vehicle.fuelPercent.value,
    }),
    ...(vehicle.engineState?.value && {
      engineState: vehicle.engineState.value,
    }),
    ...(vehicle.obdOdometerMeters?.value != null && {
      odometerMeters: vehicle.obdOdometerMeters.value,
    }),
  };
}

export async function transformVehicle(
  vehicle: SamsaraVehicle,
  context: SamsaraTransformContext
): Promise<GenericDocument> {
  const title = vehicle.name;
  const content = buildVehicleContent(vehicle);
  const metadata = buildVehicleMetadata(vehicle);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();
  const updatedAt = vehicle.updatedAtTime
    ? new Date(vehicle.updatedAtTime).getTime()
    : now;

  return {
    id: `${context.connectorId}_vehicle_${vehicle.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: vehicle.id,
    document_type: "device",
    document_subtype: "vehicle",
    title,
    content,
    created_at: updatedAt,
    updated_at: updatedAt,
    source_type: "samsara",
    source_name: context.organizationName,
    labels: vehicle.tags?.map((t) => t.name),
    url: context.organizationId
      ? `https://cloud.samsara.com/o/${context.organizationId}/fleet/vehicles/${vehicle.id}`
      : undefined,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformVehicles(
  vehicles: SamsaraVehicle[],
  context: SamsaraTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(
    vehicles.map((vehicle) => transformVehicle(vehicle, context))
  );
}
