import { plural, relativeTime } from "./helpers";

type CatalogItem = {
  templateId: string;
  name: string;
  slug: string;
  description: string;
  scheduleCron: string | null;
};

type AgentSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  mode: string;
  scheduleCron: string | null;
  createdAt: string | Date;
};

type RunSummary = {
  id: string;
  status: string;
  summary: string | null;
  error: string | null;
  toolCallCount: number;
  llmCallCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string | Date;
};

export function formatComputerCatalog(items: CatalogItem[]): string {
  if (items.length === 0) {
    return "No pre-built agents available.";
  }

  const rows = items.map(
    (a) =>
      `• ${a.name} (${a.templateId})\n  ${a.description}${a.scheduleCron ? `\n  Schedule: ${a.scheduleCron}` : ""}`
  );

  return [
    `${plural(items.length, "pre-built agent")} available:`,
    "",
    rows.join("\n\n"),
    "",
    "Next steps:",
    "• Enable an agent: computer_agent_enable with the templateId above.",
    "• List enabled agents: computer_agents_list to see what's already running.",
  ].join("\n");
}

export function formatComputerAgents(agents: AgentSummary[]): string {
  if (agents.length === 0) {
    return [
      "No agents enabled yet.",
      "",
      "Next steps:",
      "• Browse catalog: computer_catalog_list to see pre-built agents.",
      "• Generate custom: computer_agent_generate with a description of what you need.",
    ].join("\n");
  }

  const rows = agents.map((a) => {
    const status = a.status.toLowerCase();
    const mode = a.mode.toLowerCase().replace("_", " ");
    const schedule = a.scheduleCron ?? "manual";
    return `• ${a.name} [${status}] (${mode})\n  ID: ${a.id}\n  Schedule: ${schedule}`;
  });

  return [
    `${plural(agents.length, "agent")} enabled:`,
    "",
    rows.join("\n\n"),
    "",
    "Next steps:",
    "• Run an agent now: computer_agent_run with the agentId.",
    "• View run history: computer_agent_runs with the agentId.",
  ].join("\n");
}

export function formatComputerRuns(
  agentId: string,
  runs: RunSummary[]
): string {
  if (runs.length === 0) {
    return [
      "No runs yet for this agent.",
      "",
      "Next steps:",
      `• Trigger a run: computer_agent_run with agentId "${agentId}".`,
    ].join("\n");
  }

  const rows = runs.map((r) => {
    const status = r.status.toLowerCase().replace("_", " ");
    const time = relativeTime(r.completedAt ?? (r.createdAt as string));
    const detail = r.summary ?? r.error ?? "\u2014";
    const truncated = detail.length > 80 ? `${detail.slice(0, 80)}...` : detail;
    return `  ${status.padEnd(18)} ${r.toolCallCount} tools  ${time.padEnd(8)}  ${truncated}`;
  });

  return [
    `${plural(runs.length, "run")} for agent ${agentId}:`,
    "",
    ...rows,
    "",
    "Next steps:",
    "• Run again: computer_agent_run with this agentId.",
    "• View run detail: check the dashboard for step traces and proposals.",
  ].join("\n");
}

export function formatComputerRunTriggered(runId: string): string {
  return [
    `Run ${runId} started.`,
    "",
    "Next steps:",
    "• Check status: computer_agent_runs with the agentId.",
    "• The run will execute in the background and update when complete.",
  ].join("\n");
}

export function formatComputerAgentEnabled(agent: {
  name: string;
  id: string;
  status: string;
}): string {
  return [
    `Agent "${agent.name}" enabled (ID: ${agent.id}, status: ${agent.status.toLowerCase()}).`,
    "",
    "Next steps:",
    `• Run it now: computer_agent_run with agentId "${agent.id}".`,
    "• View all agents: computer_agents_list.",
  ].join("\n");
}

export function formatComputerGenerated(result: {
  name: string;
  slug: string;
  description: string;
  scheduleCron: string | null;
  plan: string[];
  toolsUsed: string[];
}): string {
  const planLines = result.plan.map((s, i) => `  ${i + 1}. ${s}`);
  const tools = result.toolsUsed.join(", ");

  return [
    `Generated agent: ${result.name}`,
    `Slug: ${result.slug}`,
    `Description: ${result.description}`,
    result.scheduleCron
      ? `Schedule: ${result.scheduleCron}`
      : "Schedule: on-demand",
    `Tools: ${tools}`,
    "",
    "Plan:",
    ...planLines,
    "",
    "IMPORTANT: Review the plan above before deploying.",
    "• Deploy: computer_agent_confirm with name, slug, description, and code.",
    "• Do NOT deploy without user confirmation.",
  ].join("\n");
}

export function formatComputerConfirmed(agent: {
  name: string;
  id: string;
}): string {
  return [
    `Agent "${agent.name}" deployed (ID: ${agent.id}).`,
    "",
    "Next steps:",
    `• Run it: computer_agent_run with agentId "${agent.id}".`,
    "• View all agents: computer_agents_list.",
  ].join("\n");
}
