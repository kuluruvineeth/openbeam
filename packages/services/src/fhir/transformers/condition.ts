import type {
  FhirCondition,
  FhirTransformContext,
} from "@openbeam/types/services/connectors/fhir";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { buildAccessControl } from "../phi/consent";
import { deidentifyResource } from "../phi/safe-harbor";

function getConditionName(condition: FhirCondition): string {
  return (
    condition.code?.text ??
    condition.code?.coding?.[0]?.display ??
    `Condition ${condition.id}`
  );
}

function buildConditionContent(
  condition: FhirCondition,
  deidentified: Record<string, unknown>
): string {
  const parts: string[] = [];

  parts.push(`Condition: ${getConditionName(condition)}`);

  const clinicalStatus =
    condition.clinicalStatus?.coding?.[0]?.display ??
    condition.clinicalStatus?.coding?.[0]?.code;
  if (clinicalStatus) {
    parts.push(`Clinical Status: ${clinicalStatus}`);
  }

  const verificationStatus =
    condition.verificationStatus?.coding?.[0]?.display ??
    condition.verificationStatus?.coding?.[0]?.code;
  if (verificationStatus) {
    parts.push(`Verification: ${verificationStatus}`);
  }

  const category = condition.category?.[0];
  if (category) {
    parts.push(
      `Category: ${category.text ?? category.coding?.[0]?.display ?? ""}`
    );
  }

  if (condition.severity) {
    parts.push(
      `Severity: ${condition.severity.text ?? condition.severity.coding?.[0]?.display ?? ""}`
    );
  }

  const onset = deidentified.onsetDateTime as string | undefined;
  if (onset) {
    parts.push(`Onset: ${onset}`);
  }

  const code = condition.code?.coding?.[0];
  if (code?.system && code?.code) {
    parts.push(`Code: ${code.system}|${code.code}`);
  }

  return parts.join("\n");
}

function buildConditionMetadata(
  condition: FhirCondition
): GenericDocument["metadata"] {
  const clinicalStatus = condition.clinicalStatus?.coding?.[0]?.code;
  const verificationStatus = condition.verificationStatus?.coding?.[0]?.code;
  const code = condition.code?.coding?.[0]?.code;
  const codeSystem = condition.code?.coding?.[0]?.system;
  const category =
    condition.category?.[0]?.text ??
    condition.category?.[0]?.coding?.[0]?.display;
  const severity = condition.severity?.coding?.[0]?.display;

  return {
    resourceType: "Condition",
    fhirId: condition.id,
    codeDisplay: getConditionName(condition),
    ...(clinicalStatus != null && { clinicalStatus }),
    ...(verificationStatus != null && { verificationStatus }),
    ...(code != null && { code }),
    ...(codeSystem != null && { codeSystem }),
    ...(category != null && { category }),
    ...(severity != null && { severity }),
  };
}

export async function transformCondition(
  condition: FhirCondition,
  context: FhirTransformContext
): Promise<GenericDocument> {
  const { deidentified } = deidentifyResource(
    condition,
    context.deidentificationStrategy
  );

  const title = getConditionName(condition);
  const content = buildConditionContent(condition, deidentified);
  const metadata = buildConditionMetadata(condition);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_condition_${condition.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: condition.id,
    document_type: "healthcare_condition",
    title,
    content,
    created_at: condition.onsetDateTime
      ? new Date(condition.onsetDateTime).getTime()
      : Date.now(),
    updated_at: condition.meta?.lastUpdated
      ? new Date(condition.meta.lastUpdated).getTime()
      : Date.now(),
    source_type: "fhir",
    url: `${context.fhirBaseUrl}/Condition/${condition.id}`,
    is_public: false,
    access_control: buildAccessControl(context.teamId),
    metadata,
    checksum,
  };
}
