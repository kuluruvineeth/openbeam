import type { JenkinsTransformContext } from "@openbeam/types/services/connectors/jenkins";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { JenkinsBuild } from "../api/builds";
import { formatBuildResult, formatDuration } from "./utils";

function extractBuildCause(build: JenkinsBuild): string | undefined {
  if (!build.actions) {
    return;
  }
  for (const action of build.actions) {
    if (action.causes && action.causes.length > 0) {
      return action.causes[0]?.shortDescription;
    }
  }
  return;
}

function extractBuildUser(build: JenkinsBuild): string | undefined {
  if (!build.actions) {
    return;
  }
  for (const action of build.actions) {
    if (action.causes) {
      for (const cause of action.causes) {
        if (cause.userName) {
          return cause.userName;
        }
      }
    }
  }
  return;
}

function extractBuildParameters(
  build: JenkinsBuild
): Record<string, string> | undefined {
  if (!build.actions) {
    return;
  }
  for (const action of build.actions) {
    if (action.parameters && action.parameters.length > 0) {
      const params: Record<string, string> = {};
      for (const p of action.parameters) {
        params[p.name] = p.value;
      }
      return params;
    }
  }
  return;
}

function buildBuildContent(
  build: JenkinsBuild,
  jobName: string,
  consoleOutput?: string
): string {
  const parts: string[] = [];

  parts.push(`Job: ${jobName}`);
  parts.push(`Result: ${formatBuildResult(build.result)}`);
  parts.push(`Duration: ${formatDuration(build.duration)}`);

  if (build.description) {
    parts.push(build.description);
  }

  const cause = extractBuildCause(build);
  if (cause) {
    parts.push(`Trigger: ${cause}`);
  }

  const user = extractBuildUser(build);
  if (user) {
    parts.push(`Started by: ${user}`);
  }

  const params = extractBuildParameters(build);
  if (params) {
    const paramLines = Object.entries(params)
      .map(([k, v]) => `  ${k}=${v}`)
      .join("\n");
    parts.push(`Parameters:\n${paramLines}`);
  }

  if (consoleOutput) {
    parts.push(`Console Output:\n${consoleOutput}`);
  }

  return parts.join("\n");
}

function buildBuildMetadata(
  build: JenkinsBuild,
  jobName: string
): GenericDocument["metadata"] {
  return {
    jobName,
    buildNumber: build.number,
    result: build.result ?? "IN_PROGRESS",
    resultLabel: formatBuildResult(build.result),
    duration: build.duration,
    durationLabel: formatDuration(build.duration),
    building: build.building,
    ...(extractBuildUser(build) && { triggeredBy: extractBuildUser(build) }),
    ...(extractBuildCause(build) && { cause: extractBuildCause(build) }),
  };
}

export async function transformBuild(
  build: JenkinsBuild,
  jobName: string,
  context: JenkinsTransformContext,
  consoleOutput?: string
): Promise<GenericDocument> {
  const title = `${jobName} #${build.number} - ${formatBuildResult(build.result)}`;
  const content = buildBuildContent(build, jobName, consoleOutput);
  const metadata = buildBuildMetadata(build, jobName);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_build_${encodeURIComponent(jobName)}_${build.number}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: `${jobName}#${build.number}`,
    document_type: "build",
    document_subtype: build.result ?? "IN_PROGRESS",
    title,
    content,
    created_at: build.timestamp,
    updated_at: build.timestamp + build.duration,
    source_type: "jenkins",
    url: build.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: extractBuildUser(build),
  };
}
