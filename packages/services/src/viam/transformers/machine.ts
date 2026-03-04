import type {
  ViamComponent,
  ViamMachine,
  ViamTransformContext,
} from "@openplane/types/services/connectors/viam";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface MachineTransformParams {
  locationName: string;
  components?: ViamComponent[];
}

function buildMachineContent(
  machine: ViamMachine,
  params: MachineTransformParams
): string {
  const parts: string[] = [];

  parts.push(`Status: ${machine.status}`);
  parts.push(`Location: ${params.locationName}`);
  parts.push(`Last access: ${machine.lastAccess}`);

  if (params.components?.length) {
    parts.push(`Components: ${params.components.length}`);
    const types = [...new Set(params.components.map((c) => c.type))];
    parts.push(`Component types: ${types.join(", ")}`);
  }

  return parts.join("\n");
}

function buildMachineMetadata(
  machine: ViamMachine,
  params: MachineTransformParams
): GenericDocument["metadata"] {
  return {
    machineId: machine.id,
    locationId: machine.locationId,
    locationName: params.locationName,
    status: machine.status,
    ...(machine.mainPartId && { mainPartId: machine.mainPartId }),
    ...(params.components && { componentCount: params.components.length }),
  };
}

export async function transformMachine(
  machine: ViamMachine,
  context: ViamTransformContext,
  params: MachineTransformParams
): Promise<GenericDocument> {
  const title = machine.name;
  const content = buildMachineContent(machine, params);
  const metadata = buildMachineMetadata(machine, params);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_machine_${machine.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: machine.id,
    document_type: "robot_machine",
    title,
    content,
    created_at: new Date(machine.createdOn).getTime(),
    updated_at: new Date(machine.lastAccess).getTime(),
    source_type: "viam",
    status: machine.status,
    url: `https://app.viam.com/robots/${machine.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformMachines(
  machines: ViamMachine[],
  context: ViamTransformContext,
  params: MachineTransformParams
): Promise<GenericDocument[]> {
  return Promise.all(machines.map((m) => transformMachine(m, context, params)));
}
