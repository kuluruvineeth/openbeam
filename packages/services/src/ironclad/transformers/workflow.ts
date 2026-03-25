import type { IroncladTransformContext } from "@openbeam/types/services/connectors/ironclad";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { IroncladWorkflow } from "../api/workflows";
import { flattenAttributes } from "./utils";

function buildWorkflowContent(workflow: IroncladWorkflow): string {
  const parts: string[] = [];

  parts.push(`Status: ${workflow.status}`);
  parts.push(`Step: ${workflow.step}`);
  parts.push(`Template: ${workflow.template}`);

  if (workflow.creator) {
    parts.push(`Creator: ${workflow.creator.name}`);
  }

  const counterparty = workflow.attributes.counterpartyName;
  if (counterparty && typeof counterparty === "string") {
    parts.push(`Counterparty: ${counterparty}`);
  }

  const attrsText = flattenAttributes(workflow.attributes);
  if (attrsText) {
    parts.push(attrsText);
  }

  return parts.join("\n");
}

export async function transformWorkflow(
  workflow: IroncladWorkflow,
  context: IroncladTransformContext
): Promise<GenericDocument> {
  const title = workflow.title || `Workflow ${workflow.id}`;
  const content = buildWorkflowContent(workflow);
  const counterparty = workflow.attributes.counterpartyName;

  const metadata: GenericDocument["metadata"] = {
    status: workflow.status,
    step: workflow.step,
    template: workflow.template,
    creatorName: workflow.creator?.name,
    creatorEmail: workflow.creator?.email,
    ...(typeof counterparty === "string" && { counterparty }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_workflow_${workflow.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: workflow.id,
    document_type: "workflow",
    document_subtype: workflow.status,
    title,
    content,
    created_at: new Date(workflow.created).getTime(),
    updated_at: new Date(workflow.lastUpdated).getTime(),
    source_type: "ironclad",
    url: `https://ironcladapp.com/workflow/${workflow.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: workflow.creator?.name,
    author_email: workflow.creator?.email,
  };
}
