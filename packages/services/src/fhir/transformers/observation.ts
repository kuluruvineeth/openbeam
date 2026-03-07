import type {
  FhirObservation,
  FhirTransformContext,
} from "@openbeam/types/services/connectors/fhir";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { buildAccessControl } from "../phi/consent";
import { deidentifyResource } from "../phi/safe-harbor";

function getCodeDisplay(observation: FhirObservation): string {
  return (
    observation.code.text ??
    observation.code.coding?.[0]?.display ??
    observation.code.coding?.[0]?.code ??
    "Unknown"
  );
}

function getValueString(observation: FhirObservation): string | undefined {
  if (observation.valueQuantity?.value !== undefined) {
    const unit = observation.valueQuantity.unit ?? "";
    return `${observation.valueQuantity.value} ${unit}`.trim();
  }
  if (observation.valueString) {
    return observation.valueString;
  }
  if (observation.valueCodeableConcept) {
    return (
      observation.valueCodeableConcept.text ??
      observation.valueCodeableConcept.coding?.[0]?.display
    );
  }
  return;
}

function buildObservationContent(
  observation: FhirObservation,
  deidentified: Record<string, unknown>
): string {
  const parts: string[] = [];
  const code = getCodeDisplay(observation);

  parts.push(`Observation: ${code}`);
  parts.push(`Status: ${observation.status}`);

  const value = getValueString(observation);
  if (value) {
    parts.push(`Value: ${value}`);
  }

  const category = observation.category?.[0];
  if (category) {
    parts.push(
      `Category: ${category.text ?? category.coding?.[0]?.display ?? ""}`
    );
  }

  if (observation.component?.length) {
    for (const comp of observation.component) {
      const compName = comp.code.text ?? comp.code.coding?.[0]?.display ?? "";
      const compVal = comp.valueQuantity
        ? `${comp.valueQuantity.value} ${comp.valueQuantity.unit ?? ""}`.trim()
        : "";
      if (compName && compVal) {
        parts.push(`${compName}: ${compVal}`);
      }
    }
  }

  const effectiveDate = deidentified.effectiveDateTime as string | undefined;
  if (effectiveDate) {
    parts.push(`Date: ${effectiveDate}`);
  }

  const interpretation = observation.interpretation?.[0];
  if (interpretation) {
    parts.push(
      `Interpretation: ${interpretation.text ?? interpretation.coding?.[0]?.display ?? ""}`
    );
  }

  return parts.join("\n");
}

function buildObservationMetadata(
  observation: FhirObservation
): GenericDocument["metadata"] {
  const code = observation.code.coding?.[0]?.code;
  const codeSystem = observation.code.coding?.[0]?.system;
  const category =
    observation.category?.[0]?.text ??
    observation.category?.[0]?.coding?.[0]?.display;

  return {
    resourceType: "Observation",
    fhirId: observation.id,
    status: observation.status,
    codeDisplay: getCodeDisplay(observation),
    ...(code != null && { code }),
    ...(codeSystem != null && { codeSystem }),
    ...(category != null && { category }),
    ...(observation.valueQuantity && {
      valueNumber: observation.valueQuantity.value,
      valueUnit: observation.valueQuantity.unit,
    }),
    ...(observation.component?.length != null && {
      componentCount: observation.component.length,
    }),
  };
}

export async function transformObservation(
  observation: FhirObservation,
  context: FhirTransformContext
): Promise<GenericDocument> {
  const { deidentified } = deidentifyResource(
    observation,
    context.deidentificationStrategy
  );
  const code = getCodeDisplay(observation);
  const title = `Observation: ${code}`;
  const content = buildObservationContent(observation, deidentified);
  const metadata = buildObservationMetadata(observation);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_observation_${observation.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: observation.id,
    document_type: "healthcare_observation",
    document_subtype:
      observation.category?.[0]?.coding?.[0]?.display?.toLowerCase(),
    title,
    content,
    created_at: observation.effectiveDateTime
      ? new Date(observation.effectiveDateTime).getTime()
      : Date.now(),
    updated_at: observation.meta?.lastUpdated
      ? new Date(observation.meta.lastUpdated).getTime()
      : Date.now(),
    source_type: "fhir",
    url: `${context.fhirBaseUrl}/Observation/${observation.id}`,
    is_public: false,
    access_control: buildAccessControl(context.teamId),
    metadata,
    checksum,
  };
}
