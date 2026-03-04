import type {
  FhirPatient,
  FhirTransformContext,
} from "@openplane/types/services/connectors/fhir";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { buildAccessControl } from "../phi/consent";
import { deidentifyResource } from "../phi/safe-harbor";

function buildPatientContent(deidentified: Record<string, unknown>): string {
  const parts: string[] = [];

  parts.push("Resource: Patient");

  if (deidentified.gender) {
    parts.push(`Gender: ${deidentified.gender}`);
  }

  if (deidentified._deidentifiedAge) {
    parts.push(`Age: ${deidentified._deidentifiedAge}`);
  }

  if (deidentified.active !== undefined) {
    parts.push(`Active: ${deidentified.active}`);
  }

  if (deidentified.deceasedBoolean !== undefined) {
    parts.push(`Deceased: ${deidentified.deceasedBoolean}`);
  }

  const marital = deidentified.maritalStatus as
    | { coding?: { display?: string }[] }
    | undefined;
  if (marital?.coding?.[0]?.display) {
    parts.push(`Marital Status: ${marital.coding[0].display}`);
  }

  return parts.join("\n");
}

function buildPatientMetadata(
  patient: FhirPatient,
  deidentified: Record<string, unknown>
): GenericDocument["metadata"] {
  return {
    resourceType: "Patient",
    fhirId: patient.id,
    ...(deidentified.gender != null && {
      gender: deidentified.gender as string,
    }),
    ...(deidentified._deidentifiedAge != null && {
      age: deidentified._deidentifiedAge as string,
    }),
    ...(patient.active != null && { active: patient.active }),
  };
}

export interface PatientTransformParams {
  deidentify?: boolean;
  deidentificationStrategy?: "safe_harbor" | "expert_determination" | "none";
}

export async function transformPatient(
  patient: FhirPatient,
  context: FhirTransformContext,
  params: PatientTransformParams = {}
): Promise<GenericDocument> {
  const {
    deidentify = true,
    deidentificationStrategy = context.deidentificationStrategy,
  } = params;

  const strategy = deidentify ? deidentificationStrategy : "none";
  const { deidentified } = deidentifyResource(patient, strategy);

  const title = `Patient ${patient.id}`;
  const content = buildPatientContent(deidentified);
  const metadata = buildPatientMetadata(patient, deidentified);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_patient_${patient.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: patient.id,
    document_type: "healthcare_patient",
    title,
    content,
    created_at: patient.meta?.lastUpdated
      ? new Date(patient.meta.lastUpdated).getTime()
      : Date.now(),
    updated_at: patient.meta?.lastUpdated
      ? new Date(patient.meta.lastUpdated).getTime()
      : Date.now(),
    source_type: "fhir",
    url: `${context.fhirBaseUrl}/Patient/${patient.id}`,
    is_public: false,
    access_control: buildAccessControl(context.teamId),
    metadata,
    checksum,
  };
}
