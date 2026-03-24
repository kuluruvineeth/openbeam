import type { AmplitudeTransformContext } from "@openbeam/types/services/connectors/amplitude";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { AmplitudeCohort } from "../api/cohorts";
import { buildAmplitudeCohortUrl } from "./utils";

function buildCohortContent(cohort: AmplitudeCohort): string {
  const parts: string[] = [];

  if (cohort.description) {
    parts.push(cohort.description);
  }

  if (cohort.owner) {
    parts.push(`Creator: ${cohort.owner}`);
  }

  if (cohort.size !== undefined) {
    parts.push(`Estimated Size: ${cohort.size.toLocaleString()} users`);
  }

  if (cohort.definition) {
    parts.push(`Definition: ${JSON.stringify(cohort.definition)}`);
  }

  if (cohort.published !== undefined) {
    parts.push(`Published: ${cohort.published ? "Yes" : "No"}`);
  }

  if (cohort.lastComputed) {
    parts.push(`Last Computed: ${cohort.lastComputed}`);
  }

  return parts.join("\n");
}

function buildCohortMetadata(
  cohort: AmplitudeCohort
): GenericDocument["metadata"] {
  return {
    cohortId: cohort.id,
    ...(cohort.owner && { owner: cohort.owner }),
    ...(cohort.size !== undefined && { size: cohort.size }),
    ...(cohort.published !== undefined && { published: cohort.published }),
    ...(cohort.appId && { appId: String(cohort.appId) }),
  };
}

export async function transformCohort(
  cohort: AmplitudeCohort,
  context: AmplitudeTransformContext
): Promise<GenericDocument> {
  const title = cohort.name;
  const content = buildCohortContent(cohort);
  const metadata = buildCohortMetadata(cohort);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = cohort.createdAt
    ? new Date(cohort.createdAt).getTime()
    : Date.now();
  const updatedAt = cohort.lastModified
    ? new Date(cohort.lastModified).getTime()
    : createdAt;

  return {
    id: `${context.connectorId}_cohort_${cohort.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: cohort.id,
    document_type: "cohort",
    document_subtype: "user_segment",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "amplitude",
    url: buildAmplitudeCohortUrl(context.orgSlug, cohort.id),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: cohort.owner,
  };
}
