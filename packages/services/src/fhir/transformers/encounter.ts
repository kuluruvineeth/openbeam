import type {
  FhirEncounter,
  FhirTransformContext,
} from "@openbeam/types/services/connectors/fhir";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { buildAccessControl } from "../phi/consent";
import { deidentifyResource } from "../phi/safe-harbor";

function getEncounterType(encounter: FhirEncounter): string {
  return (
    encounter.type?.[0]?.text ??
    encounter.type?.[0]?.coding?.[0]?.display ??
    encounter.class?.display ??
    "Encounter"
  );
}

function buildEncounterContent(
  encounter: FhirEncounter,
  deidentified: Record<string, unknown>
): string {
  const parts: string[] = [];

  parts.push(`Encounter: ${getEncounterType(encounter)}`);
  parts.push(`Status: ${encounter.status}`);

  if (encounter.class?.display) {
    parts.push(`Class: ${encounter.class.display}`);
  }

  const period = deidentified.period as
    | { start?: string; end?: string }
    | undefined;
  if (period?.start) {
    parts.push(`Start: ${period.start}`);
  }
  if (period?.end) {
    parts.push(`End: ${period.end}`);
  }

  if (encounter.serviceProvider?.display) {
    parts.push(`Provider: ${encounter.serviceProvider.display}`);
  }

  if (encounter.reasonCode?.length) {
    const reasons = encounter.reasonCode
      .map((r) => r.text ?? r.coding?.[0]?.display)
      .filter(Boolean);
    if (reasons.length > 0) {
      parts.push(`Reasons: ${reasons.join(", ")}`);
    }
  }

  if (encounter.participant?.length) {
    parts.push(`Participants: ${encounter.participant.length}`);
  }

  return parts.join("\n");
}

function buildEncounterMetadata(
  encounter: FhirEncounter
): GenericDocument["metadata"] {
  const encounterType =
    encounter.type?.[0]?.coding?.[0]?.display ?? encounter.type?.[0]?.text;
  return {
    resourceType: "Encounter",
    fhirId: encounter.id,
    status: encounter.status,
    ...(encounter.class?.code != null && {
      encounterClass: encounter.class.code,
    }),
    ...(encounterType != null && { encounterType }),
    ...(encounter.participant?.length != null && {
      participantCount: encounter.participant.length,
    }),
    hasServiceProvider: !!encounter.serviceProvider,
  };
}

export async function transformEncounter(
  encounter: FhirEncounter,
  context: FhirTransformContext
): Promise<GenericDocument> {
  const { deidentified } = deidentifyResource(
    encounter,
    context.deidentificationStrategy
  );

  const title = `${getEncounterType(encounter)} — ${encounter.status}`;
  const content = buildEncounterContent(encounter, deidentified);
  const metadata = buildEncounterMetadata(encounter);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_encounter_${encounter.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: encounter.id,
    document_type: "healthcare_encounter",
    title,
    content,
    created_at: encounter.period?.start
      ? new Date(encounter.period.start).getTime()
      : Date.now(),
    updated_at: encounter.meta?.lastUpdated
      ? new Date(encounter.meta.lastUpdated).getTime()
      : Date.now(),
    source_type: "fhir",
    url: `${context.fhirBaseUrl}/Encounter/${encounter.id}`,
    is_public: false,
    access_control: buildAccessControl(context.teamId),
    metadata,
    checksum,
  };
}
