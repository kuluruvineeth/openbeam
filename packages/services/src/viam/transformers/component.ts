import type {
  ViamComponent,
  ViamTransformContext,
} from "@openplane/types/services/connectors/viam";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface ComponentTransformParams {
  machineId: string;
  machineName: string;
}

function buildComponentContent(
  component: ViamComponent,
  params: ComponentTransformParams
): string {
  const parts: string[] = [];

  parts.push(`Type: ${component.type}`);
  parts.push(`Model: ${component.model}`);
  parts.push(`Namespace: ${component.namespace}`);
  parts.push(`Machine: ${params.machineName}`);

  if (component.dependsOn?.length) {
    parts.push(`Depends on: ${component.dependsOn.join(", ")}`);
  }

  return parts.join("\n");
}

function buildComponentMetadata(
  component: ViamComponent,
  params: ComponentTransformParams
): GenericDocument["metadata"] {
  return {
    componentName: component.name,
    componentType: component.type,
    model: component.model,
    namespace: component.namespace,
    machineId: params.machineId,
    ...(component.dependsOn?.length && { dependsOn: component.dependsOn }),
    ...(component.attributes && { hasAttributes: true }),
  };
}

export async function transformComponent(
  component: ViamComponent,
  context: ViamTransformContext,
  params: ComponentTransformParams
): Promise<GenericDocument> {
  const title = component.name;
  const content = buildComponentContent(component, params);
  const metadata = buildComponentMetadata(component, params);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();

  return {
    id: `${context.connectorId}_component_${params.machineId}_${component.name}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: `${params.machineId}:${component.name}`,
    document_type: "robot_component",
    document_subtype: component.type,
    title,
    content,
    parent_id: `${context.connectorId}_machine_${params.machineId}`,
    created_at: now,
    updated_at: now,
    source_type: "viam",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformComponents(
  components: ViamComponent[],
  context: ViamTransformContext,
  params: ComponentTransformParams
): Promise<GenericDocument[]> {
  return Promise.all(
    components.map((c) => transformComponent(c, context, params))
  );
}
