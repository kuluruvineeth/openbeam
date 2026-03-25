import type { JFrogTransformContext } from "@openbeam/types/services/connectors/jfrog";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { JFrogBuild } from "../api/builds";
import { buildJFrogBuildUrl, formatDuration } from "./utils";

function buildBuildContent(build: JFrogBuild): string {
  const parts: string[] = [];

  parts.push(`Build: ${build.buildName} #${build.buildNumber}`);

  if (build.status) {
    parts.push(`Status: ${build.status}`);
  }

  if (build.durationMillis) {
    parts.push(`Duration: ${formatDuration(build.durationMillis)}`);
  }

  if (build.principal) {
    parts.push(`Triggered by: ${build.principal}`);
  }

  if (build.buildAgent) {
    parts.push(
      `Build Agent: ${build.buildAgent.name} ${build.buildAgent.version}`
    );
  }

  if (build.agent) {
    parts.push(`Agent: ${build.agent.name} ${build.agent.version}`);
  }

  if (build.vcs?.length) {
    for (const vcs of build.vcs) {
      parts.push(`VCS: ${vcs.url}`);
      if (vcs.branch) {
        parts.push(`Branch: ${vcs.branch}`);
      }
      parts.push(`Revision: ${vcs.revision}`);
    }
  }

  if (build.modules?.length) {
    parts.push(`Modules: ${build.modules.map((m) => m.id).join(", ")}`);
    const totalArtifacts = build.modules.reduce(
      (sum, m) => sum + (m.artifacts?.length ?? 0),
      0
    );
    const totalDeps = build.modules.reduce(
      (sum, m) => sum + (m.dependencies?.length ?? 0),
      0
    );
    if (totalArtifacts > 0) {
      parts.push(`Published artifacts: ${totalArtifacts}`);
    }
    if (totalDeps > 0) {
      parts.push(`Dependencies: ${totalDeps}`);
    }
  }

  if (build.properties) {
    const propEntries = Object.entries(build.properties);
    if (propEntries.length > 0) {
      parts.push(propEntries.map(([k, v]) => `${k}: ${v}`).join("\n"));
    }
  }

  return parts.join("\n");
}

function buildBuildMetadata(build: JFrogBuild): GenericDocument["metadata"] {
  return {
    buildName: build.buildName,
    buildNumber: build.buildNumber,
    ...(build.status && { status: build.status }),
    ...(build.durationMillis && {
      durationMs: build.durationMillis,
      duration: formatDuration(build.durationMillis),
    }),
    ...(build.principal && { principal: build.principal }),
    ...(build.buildAgent && {
      buildAgent: `${build.buildAgent.name} ${build.buildAgent.version}`,
    }),
    ...(build.modules?.length && {
      moduleCount: build.modules.length,
      modules: build.modules.map((m) => m.id).join(", "),
    }),
    ...(build.vcs?.length && {
      vcsUrl: build.vcs[0]?.url,
      ...(build.vcs[0]?.branch && { vcsBranch: build.vcs[0].branch }),
    }),
  };
}

export async function transformBuild(
  build: JFrogBuild,
  context: JFrogTransformContext
): Promise<GenericDocument> {
  const uniqueKey = `${build.buildName}/${build.buildNumber}`;
  const title = `${build.buildName} #${build.buildNumber}`;
  const content = buildBuildContent(build);
  const metadata = buildBuildMetadata(build);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const startedAt = new Date(build.buildStarted).getTime();

  return {
    id: `${context.connectorId}_build_${Buffer.from(uniqueKey).toString("base64url")}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: uniqueKey,
    document_type: "build",
    document_subtype: build.status ?? "unknown",
    title,
    content,
    created_at: startedAt,
    updated_at: startedAt,
    source_type: "jfrog",
    url: buildJFrogBuildUrl(
      context.instanceUrl,
      build.buildName,
      build.buildNumber
    ),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: build.principal,
  };
}
