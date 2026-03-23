import type { GongTransformContext } from "@openbeam/types/services/connectors/gong";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { GongCall, GongParty, GongTranscript } from "../client";

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
  return `${minutes}m ${remaining}s`;
}

function formatParties(parties: GongParty[]): string {
  return parties
    .map((p) => {
      const parts: string[] = [];
      if (p.name) {
        parts.push(p.name);
      }
      if (p.title) {
        parts.push(`(${p.title})`);
      }
      if (p.emailAddress) {
        parts.push(`<${p.emailAddress}>`);
      }
      parts.push(`[${p.affiliation}]`);
      return parts.join(" ");
    })
    .join("\n");
}

function buildCallContent(call: GongCall, transcript?: GongTranscript): string {
  const parts: string[] = [];

  parts.push(`Call: ${call.title}`);
  parts.push(`Date: ${new Date(call.started).toISOString()}`);
  parts.push(`Duration: ${formatDuration(call.duration)}`);
  parts.push(`Direction: ${call.direction}`);

  if (call.purpose) {
    parts.push(`Purpose: ${call.purpose}`);
  }
  if (call.disposition) {
    parts.push(`Disposition: ${call.disposition}`);
  }

  if (call.parties.length > 0) {
    parts.push("");
    parts.push("Participants:");
    parts.push(formatParties(call.parties));
  }

  if (transcript?.transcript && transcript.transcript.length > 0) {
    parts.push("");
    parts.push("Transcript:");
    for (const segment of transcript.transcript) {
      for (const sentence of segment.sentences) {
        const speaker = segment.speakerId ?? "Unknown";
        parts.push(`[${speaker}] ${sentence.text}`);
      }
    }
  }

  return parts.join("\n");
}

function buildCallMetadata(call: GongCall): GenericDocument["metadata"] {
  const internalParties = call.parties
    .filter((p) => p.affiliation === "Internal")
    .map((p) => p.name ?? p.emailAddress ?? "Unknown");
  const externalParties = call.parties
    .filter((p) => p.affiliation === "External")
    .map((p) => p.name ?? p.emailAddress ?? "Unknown");

  return {
    gongCallId: call.id,
    direction: call.direction,
    durationSeconds: call.duration,
    durationFormatted: formatDuration(call.duration),
    scope: call.scope,
    media: call.media,
    language: call.language,
    ...(call.purpose && { purpose: call.purpose }),
    ...(call.disposition && { disposition: call.disposition }),
    participantCount: call.parties.length,
    internalParticipants: JSON.stringify(internalParties),
    externalParticipants: JSON.stringify(externalParties),
  };
}

export async function transformCall(
  call: GongCall,
  ctx: GongTransformContext,
  transcript?: GongTranscript
): Promise<GenericDocument> {
  const title =
    call.title || `Call on ${new Date(call.started).toLocaleDateString()}`;
  const content = buildCallContent(call, transcript);
  const metadata = buildCallMetadata(call);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const startedAt = new Date(call.started).getTime();

  return {
    id: `${ctx.connectorId}_call_${call.id}`,
    connector_id: ctx.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: call.id,
    document_type: transcript ? "transcript" : "call",
    document_subtype: call.direction.toLowerCase(),
    title,
    content,
    created_at: startedAt,
    updated_at: startedAt,
    source_type: "gong",
    url: call.url,
    is_public: false,
    access_control: [`team:${ctx.teamId}`],
    metadata,
    checksum,
  };
}

export function transformCalls(
  calls: GongCall[],
  ctx: GongTransformContext,
  transcriptMap?: Map<string, GongTranscript>
): Promise<GenericDocument[]> {
  return Promise.all(
    calls.map((call) => transformCall(call, ctx, transcriptMap?.get(call.id)))
  );
}
