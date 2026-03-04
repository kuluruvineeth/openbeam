import type {
  FhirMedicationRequest,
  FhirTransformContext,
} from "@openplane/types/services/connectors/fhir";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { buildAccessControl } from "../phi/consent";
import { deidentifyResource } from "../phi/safe-harbor";

function getMedicationName(med: FhirMedicationRequest): string {
  return (
    med.medicationCodeableConcept?.text ??
    med.medicationCodeableConcept?.coding?.[0]?.display ??
    `Medication Request ${med.id}`
  );
}

function buildMedicationContent(
  med: FhirMedicationRequest,
  deidentified: Record<string, unknown>
): string {
  const parts: string[] = [];

  parts.push(`Medication: ${getMedicationName(med)}`);
  parts.push(`Status: ${med.status}`);
  parts.push(`Intent: ${med.intent}`);

  if (med.dosageInstruction?.length) {
    const dosage = med.dosageInstruction[0];
    if (dosage?.text) {
      parts.push(`Dosage: ${dosage.text}`);
    } else if (dosage?.doseAndRate?.[0]?.doseQuantity) {
      const dose = dosage.doseAndRate[0].doseQuantity;
      parts.push(`Dose: ${dose.value} ${dose.unit ?? ""}`.trim());
    }

    if (dosage?.timing?.repeat) {
      const r = dosage.timing.repeat;
      if (r.frequency && r.period && r.periodUnit) {
        parts.push(
          `Frequency: ${r.frequency}x per ${r.period} ${r.periodUnit}`
        );
      }
    }
  }

  const authored = deidentified.authoredOn as string | undefined;
  if (authored) {
    parts.push(`Authored: ${authored}`);
  }

  const code = med.medicationCodeableConcept?.coding?.[0];
  if (code?.system && code?.code) {
    parts.push(`Code: ${code.system}|${code.code}`);
  }

  return parts.join("\n");
}

function buildMedicationMetadata(
  med: FhirMedicationRequest
): GenericDocument["metadata"] {
  const medicationCode = med.medicationCodeableConcept?.coding?.[0]?.code;
  return {
    resourceType: "MedicationRequest",
    fhirId: med.id,
    status: med.status,
    intent: med.intent,
    medicationDisplay: getMedicationName(med),
    hasDosageInstruction: (med.dosageInstruction?.length ?? 0) > 0,
    ...(medicationCode != null && { medicationCode }),
  };
}

export async function transformMedication(
  med: FhirMedicationRequest,
  context: FhirTransformContext
): Promise<GenericDocument> {
  const { deidentified } = deidentifyResource(
    med,
    context.deidentificationStrategy
  );

  const title = getMedicationName(med);
  const content = buildMedicationContent(med, deidentified);
  const metadata = buildMedicationMetadata(med);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_medication_${med.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: med.id,
    document_type: "healthcare_medication",
    title,
    content,
    created_at: med.authoredOn
      ? new Date(med.authoredOn).getTime()
      : Date.now(),
    updated_at: med.meta?.lastUpdated
      ? new Date(med.meta.lastUpdated).getTime()
      : Date.now(),
    source_type: "fhir",
    url: `${context.fhirBaseUrl}/MedicationRequest/${med.id}`,
    is_public: false,
    access_control: buildAccessControl(context.teamId),
    metadata,
    checksum,
  };
}
