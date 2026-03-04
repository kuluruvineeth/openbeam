import type {
  FhirProcedure,
  FhirTransformContext,
} from "@openplane/types/services/connectors/fhir";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { buildAccessControl } from "../phi/consent";
import { deidentifyResource } from "../phi/safe-harbor";

function getProcedureName(procedure: FhirProcedure): string {
  return (
    procedure.code?.text ??
    procedure.code?.coding?.[0]?.display ??
    `Procedure ${procedure.id}`
  );
}

function buildProcedureContent(
  procedure: FhirProcedure,
  deidentified: Record<string, unknown>
): string {
  const parts: string[] = [];

  parts.push(`Procedure: ${getProcedureName(procedure)}`);
  parts.push(`Status: ${procedure.status}`);

  const performedDate = deidentified.performedDateTime as string | undefined;
  if (performedDate) {
    parts.push(`Date: ${performedDate}`);
  }

  const performedPeriod = deidentified.performedPeriod as
    | { start?: string; end?: string }
    | undefined;
  if (performedPeriod?.start) {
    parts.push(`Start: ${performedPeriod.start}`);
  }
  if (performedPeriod?.end) {
    parts.push(`End: ${performedPeriod.end}`);
  }

  if (procedure.bodySite?.length) {
    const sites = procedure.bodySite
      .map((s) => s.text ?? s.coding?.[0]?.display)
      .filter(Boolean);
    if (sites.length > 0) {
      parts.push(`Body Site: ${sites.join(", ")}`);
    }
  }

  if (procedure.outcome) {
    parts.push(
      `Outcome: ${procedure.outcome.text ?? procedure.outcome.coding?.[0]?.display ?? ""}`
    );
  }

  if (procedure.reasonCode?.length) {
    const reasons = procedure.reasonCode
      .map((r) => r.text ?? r.coding?.[0]?.display)
      .filter(Boolean);
    if (reasons.length > 0) {
      parts.push(`Reason: ${reasons.join(", ")}`);
    }
  }

  if (procedure.performer?.length) {
    parts.push(`Performers: ${procedure.performer.length}`);
  }

  const code = procedure.code?.coding?.[0];
  if (code?.system && code?.code) {
    parts.push(`Code: ${code.system}|${code.code}`);
  }

  return parts.join("\n");
}

function buildProcedureMetadata(
  procedure: FhirProcedure
): GenericDocument["metadata"] {
  const code = procedure.code?.coding?.[0]?.code;
  const codeSystem = procedure.code?.coding?.[0]?.system;

  return {
    resourceType: "Procedure",
    fhirId: procedure.id,
    status: procedure.status,
    codeDisplay: getProcedureName(procedure),
    hasOutcome: !!procedure.outcome,
    ...(code != null && { code }),
    ...(codeSystem != null && { codeSystem }),
    ...(procedure.bodySite?.length != null && {
      bodySiteCount: procedure.bodySite.length,
    }),
    ...(procedure.performer?.length != null && {
      performerCount: procedure.performer.length,
    }),
  };
}

export async function transformProcedure(
  procedure: FhirProcedure,
  context: FhirTransformContext
): Promise<GenericDocument> {
  const { deidentified } = deidentifyResource(
    procedure,
    context.deidentificationStrategy
  );

  const title = getProcedureName(procedure);
  const content = buildProcedureContent(procedure, deidentified);
  const metadata = buildProcedureMetadata(procedure);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_procedure_${procedure.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: procedure.id,
    document_type: "healthcare_procedure",
    title,
    content,
    created_at: procedure.performedDateTime
      ? new Date(procedure.performedDateTime).getTime()
      : Date.now(),
    updated_at: procedure.meta?.lastUpdated
      ? new Date(procedure.meta.lastUpdated).getTime()
      : Date.now(),
    source_type: "fhir",
    url: `${context.fhirBaseUrl}/Procedure/${procedure.id}`,
    is_public: false,
    access_control: buildAccessControl(context.teamId),
    metadata,
    checksum,
  };
}
