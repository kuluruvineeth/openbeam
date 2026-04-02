import { plural } from "./helpers";

type AgentTemplate = {
  name: string;
  description: string;
  category: string;
  estimatedDuration: string;
};

type AgentRunResult = {
  agentName: string;
  output: string;
  stepsUsed: number;
  durationMs: number;
  citations?: Array<{
    title?: string | null;
    source?: string | null;
  }> | null;
};

export function formatAgentList(agents: AgentTemplate[]): string {
  if (agents.length === 0) {
    return "No agent templates available.";
  }

  const rows = agents.map(
    (a) =>
      `• ${a.name} (${a.category})\n  ${a.description}\n  Estimated: ${a.estimatedDuration}`
  );

  return [
    `${plural(agents.length, "agent template")} available:`,
    "",
    rows.join("\n\n"),
    "",
    "Next steps:",
    "• Run an agent: agent_run with the agent name and your task input.",
    "• Search documents first: search_documents to gather context before running an agent.",
  ].join("\n");
}

export function formatAgentRunResult(r: AgentRunResult): string {
  const parts: string[] = [
    `Agent: ${r.agentName}`,
    `Steps: ${r.stepsUsed}`,
    `Duration: ${r.durationMs}ms`,
    "",
    r.output,
  ];

  if (r.citations && r.citations.length > 0) {
    parts.push("\nSources:");
    for (const [i, c] of r.citations.entries()) {
      const title = c.title ?? "Untitled";
      const source = c.source ? ` (${c.source})` : "";
      parts.push(`[${i + 1}] ${title}${source}`);
    }
  }

  parts.push("");
  parts.push("Next steps:");
  parts.push(
    "• Ask a follow-up question: agent_run with the same agent and a refined task."
  );
  parts.push(
    "• Read a cited source: context_read with a citation URI for full details."
  );
  parts.push(
    "• Search for more: search_documents to find additional related content."
  );

  return parts.join("\n");
}

export function formatAgentStatus(): string {
  return [
    "Agent execution is synchronous — results are returned immediately from agent_run.",
    "",
    "Async execution via Temporal workflows is planned for a future release.",
    "When available, agent_status will return real-time progress for long-running agent tasks.",
    "",
    "Next steps:",
    "• Run an agent now: agent_run with an agent name and task input.",
    "• List available agents: agent_list to see all templates.",
  ].join("\n");
}
