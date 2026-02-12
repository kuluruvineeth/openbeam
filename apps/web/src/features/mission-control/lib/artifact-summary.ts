import type { MissionEventLedgerItem } from "@openplane/types/mission-control";
import type { ArtifactSummary } from "../components/mission-artifact-panel";

type ArtifactRun = {
  runId: string;
  agentName: string;
  createdAt: Date;
  artifacts: unknown[];
};

const ARTIFACT_TYPES: Record<ArtifactSummary["type"], true> = {
  document: true,
  report: true,
  code: true,
  data: true,
  image: true,
  other: true,
};

const ARTIFACT_STATUSES: Record<ArtifactSummary["status"], true> = {
  generating: true,
  completed: true,
  failed: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toArtifactType(value: unknown): ArtifactSummary["type"] {
  if (typeof value === "string") {
    if (value in ARTIFACT_TYPES) {
      return value as ArtifactSummary["type"];
    }
    if (value === "text") {
      return "document";
    }
  }
  return "other";
}

function toArtifactStatus(value: unknown): ArtifactSummary["status"] {
  if (typeof value === "string") {
    if (value in ARTIFACT_STATUSES) {
      return value as ArtifactSummary["status"];
    }
    if (value === "final") {
      return "completed";
    }
  }
  return "completed";
}

function toArtifactTitle(
  artifact: Record<string, unknown>,
  index: number
): string {
  const explicitTitle = artifact.title;
  if (typeof explicitTitle === "string" && explicitTitle.length > 0) {
    return explicitTitle;
  }

  const content = artifact.content;
  if (typeof content === "string" && content.trim().length > 0) {
    const firstLine = content.trim().split("\n")[0];
    if (firstLine && firstLine.length > 0) {
      return firstLine.slice(0, 96);
    }
  }

  return `Artifact ${index + 1}`;
}

function normalizeTitle(value: string): string {
  return value
    .replace(/[`*_#>[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

function toArtifactCreatedAt(
  artifact: Record<string, unknown>,
  fallbackCreatedAt: number
): number {
  const value = artifact.createdAt;
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallbackCreatedAt;
}

function toArtifactVersion(artifact: Record<string, unknown>): number {
  const value = artifact.version;
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 1;
}

function readPayloadString(
  event: MissionEventLedgerItem,
  key: string
): string | undefined {
  const value = event.payload?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function buildTitleFromContent(content: unknown, fallback: string): string {
  if (typeof content === "string") {
    const firstLine = content.trim().split("\n")[0];
    if (firstLine && firstLine.length > 0) {
      return normalizeTitle(firstLine.slice(0, 120));
    }
  }

  if (isRecord(content)) {
    const title = content.title;
    if (typeof title === "string" && title.length > 0) {
      return normalizeTitle(title);
    }
  }

  return normalizeTitle(fallback);
}

export function mapArtifactRunsToSummaries(
  runs: ArtifactRun[]
): ArtifactSummary[] {
  const results: ArtifactSummary[] = [];

  for (const run of runs) {
    const fallbackCreatedAt = new Date(run.createdAt).getTime();
    for (const [index, artifact] of run.artifacts.entries()) {
      if (!isRecord(artifact)) {
        continue;
      }

      results.push({
        artifactId:
          typeof artifact.id === "string" && artifact.id.length > 0
            ? artifact.id
            : `${run.runId}-${index}`,
        title: normalizeTitle(toArtifactTitle(artifact, index)),
        type: toArtifactType(artifact.type),
        agentName: run.agentName,
        version: toArtifactVersion(artifact),
        status: toArtifactStatus(artifact.status),
        createdAt: toArtifactCreatedAt(artifact, fallbackCreatedAt),
        previewUrl:
          typeof artifact.previewUrl === "string"
            ? artifact.previewUrl
            : undefined,
        content: artifact.content,
      });
    }
  }

  return results.sort((a, b) => b.createdAt - a.createdAt);
}

export function mapMissionEventsToArtifactSummaries(
  events: MissionEventLedgerItem[]
): ArtifactSummary[] {
  const artifactResults: ArtifactSummary[] = [];
  const seenArtifactIds = new Set<string>();

  for (const event of [...events].sort((a, b) => b.timestamp - a.timestamp)) {
    if (event.eventType !== "artifact.published") {
      continue;
    }

    const artifactId =
      readPayloadString(event, "artifactId") ??
      `artifact-event-${event.eventId}`;
    if (seenArtifactIds.has(artifactId)) {
      continue;
    }

    const content = event.payload?.content;
    const artifactTitle = readPayloadString(event, "artifactTitle");
    artifactResults.push({
      artifactId,
      title:
        (artifactTitle ? normalizeTitle(artifactTitle) : undefined) ??
        buildTitleFromContent(content, "Output artifact"),
      type: toArtifactType(event.payload?.artifactType),
      agentName: event.agentName ?? "System",
      version: 1,
      status: "completed",
      createdAt: event.timestamp,
      content,
    });
    seenArtifactIds.add(artifactId);
  }

  if (artifactResults.length > 0) {
    return artifactResults;
  }

  const latestStepByAgent = new Map<string, MissionEventLedgerItem>();
  for (const event of events) {
    if (event.eventType !== "agent_step_completed") {
      continue;
    }
    if (event.payload?.content === undefined) {
      continue;
    }

    const key =
      readPayloadString(event, "agentId") ?? event.agentName ?? "agent";
    const existing = latestStepByAgent.get(key);
    if (!existing || event.timestamp > existing.timestamp) {
      latestStepByAgent.set(key, event);
    }
  }

  const stepArtifacts = [...latestStepByAgent.values()]
    .map((event) => ({
      artifactId: `step-event-${event.eventId}`,
      title: buildTitleFromContent(
        event.payload?.content,
        `${event.agentName ?? "Agent"} output`
      ),
      type: "document" as const,
      agentName: event.agentName ?? "System",
      version: 1,
      status: "completed" as const,
      createdAt: event.timestamp,
      content: event.payload?.content,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);

  if (stepArtifacts.length > 0) {
    return stepArtifacts;
  }

  const latestCompletion = [...events]
    .filter(
      (event) =>
        event.eventType === "mission.completed" ||
        event.eventType === "orchestrator_completed"
    )
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  if (!latestCompletion) {
    return [];
  }

  return [
    {
      artifactId: `completion-event-${latestCompletion.eventId}`,
      title: buildTitleFromContent(
        latestCompletion.summary,
        "Mission completion summary"
      ),
      type: "document",
      agentName: latestCompletion.agentName ?? "System",
      version: 1,
      status: "completed",
      createdAt: latestCompletion.timestamp,
      content: latestCompletion.summary,
    },
  ];
}
