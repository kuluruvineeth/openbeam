import { relativeTime } from "./helpers";

type SessionEntry = {
  id: string;
  agentId?: string | null;
  totalTokens?: number | null;
  archiveCount?: number | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export function formatSessionCreate(session: SessionEntry): string {
  const agent = session.agentId ? ` (agent: ${session.agentId})` : "";
  return [
    `Session created: ${session.id}${agent}`,
    "",
    "Next steps:",
    "• Add messages: session_message with role and content.",
    "• Commit when done: session_commit to trigger memory extraction.",
  ].join("\n");
}

export function formatSessionMessage(
  sessionId: string,
  role: string,
  totalTokens: number
): string {
  return [
    `Message added (${role}) to session ${sessionId}.`,
    `Total tokens: ${totalTokens.toLocaleString()}`,
    "",
    "Next steps:",
    "• Add more messages: session_message.",
    "• Commit session: session_commit when the conversation is complete.",
  ].join("\n");
}

export function formatSessionCommit(
  sessionId: string,
  messageCount: number,
  totalTokens: number
): string {
  return [
    `Session ${sessionId} committed.`,
    `  Messages: ${messageCount}`,
    `  Tokens: ${totalTokens.toLocaleString()}`,
    "  Status: committed (pending memory extraction)",
    "",
    "Next steps:",
    "• Check memories: memory_list to see extracted knowledge.",
    "• Start a new session: session_create.",
  ].join("\n");
}

export function formatSessionHistory(sessions: SessionEntry[]): string {
  if (sessions.length === 0) {
    return [
      "No sessions found.",
      "",
      "Next steps:",
      "• Create one: session_create to start tracking a conversation.",
    ].join("\n");
  }

  const rows = sessions.map((s) => {
    const status = s.status ?? "unknown";
    const tokens = s.totalTokens?.toLocaleString() ?? "0";
    const updated = relativeTime(s.updatedAt);
    const agent = s.agentId ? ` [agent: ${s.agentId}]` : "";
    return `• ${s.id}  ${status}  ${tokens} tokens  ${updated}${agent}`;
  });

  return [
    `${sessions.length} sessions:`,
    "",
    rows.join("\n"),
    "",
    "Next steps:",
    "• Continue an active session: session_message with the session ID.",
    "• Create new: session_create.",
  ].join("\n");
}
