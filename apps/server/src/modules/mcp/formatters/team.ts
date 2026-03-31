import { num } from "./helpers";

type TeamInfo = {
  id: string;
  name?: string | null;
  slug?: string | null;
  plan?: string | null;
  connectorCount?: number | null;
  memberCount?: number | null;
  documentCount?: number | null;
};

type TeamMember = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

export function formatTeamInfo(t: TeamInfo): string {
  const parts = [
    t.name ?? "Your team",
    t.plan ? `Plan: ${t.plan}` : null,
    t.memberCount != null ? `Members: ${t.memberCount}` : null,
    t.connectorCount != null ? `Connected sources: ${t.connectorCount}` : null,
    t.documentCount != null ? `Total documents: ${num(t.documentCount)}` : null,
  ].filter(Boolean);

  parts.push("");
  parts.push("To see team members: use team_members.");
  parts.push("To list connectors: use connector_list.");

  return parts.join("\n");
}

export function formatTeamMembers(members: TeamMember[]): string {
  if (members.length === 0) {
    return "No team members found.";
  }

  const rows = members.map((m) => {
    const role = m.role ? ` (${m.role})` : "";
    const email = m.email ? ` — ${m.email}` : "";
    return `• ${m.name ?? "Unknown"}${role}${email}`;
  });

  return `${members.length} team members:\n\n${rows.join("\n")}`;
}
