import type { MissionEventLedgerItem } from "@openplane/types/mission-control";

export type MissionOutcomeSnapshot = {
  title: string;
  subtitle: string;
  timestamp: number;
  source: "artifact" | "completion";
  artifactId?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  value: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const candidate = value?.[key];
  if (typeof candidate !== "string" || candidate.length === 0) {
    return;
  }
  return candidate;
}

function formatAgentLabel(event: MissionEventLedgerItem): string {
  return event.agentName ? `by ${event.agentName}` : "by system";
}

function formatOutcomeTitle(value: string): string {
  return value
    .replace(/[`*_#>[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

export function deriveMissionOutcome(
  events: MissionEventLedgerItem[]
): MissionOutcomeSnapshot | null {
  const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);

  for (const event of sorted) {
    if (event.eventType !== "artifact.published") {
      continue;
    }

    const payload = isRecord(event.payload) ? event.payload : undefined;
    const artifactTitle =
      readString(payload, "artifactTitle") ||
      readString(payload, "title") ||
      event.summary ||
      "Output artifact published";
    const artifactId = readString(payload, "artifactId");

    return {
      title: formatOutcomeTitle(artifactTitle),
      subtitle: formatAgentLabel(event),
      timestamp: event.timestamp,
      source: "artifact",
      artifactId,
    };
  }

  for (const event of sorted) {
    if (event.eventType !== "agent_step_completed") {
      continue;
    }

    const payload = isRecord(event.payload) ? event.payload : undefined;
    const content = payload?.content;
    let title: string | undefined;

    if (typeof content === "string") {
      title = content.trim().split("\n")[0];
    } else if (isRecord(content)) {
      const contentTitle = content.title;
      if (typeof contentTitle === "string" && contentTitle.length > 0) {
        title = contentTitle;
      }
    }

    if (!title) {
      continue;
    }

    return {
      title: formatOutcomeTitle(title),
      subtitle: `Latest output ${formatAgentLabel(event)}`,
      timestamp: event.timestamp,
      source: "completion",
    };
  }

  for (const event of sorted) {
    if (
      event.eventType !== "mission.completed" &&
      event.eventType !== "orchestrator_completed"
    ) {
      continue;
    }

    return {
      title: formatOutcomeTitle(event.summary || "Mission completed"),
      subtitle: "No published output artifact yet",
      timestamp: event.timestamp,
      source: "completion",
    };
  }

  return null;
}
