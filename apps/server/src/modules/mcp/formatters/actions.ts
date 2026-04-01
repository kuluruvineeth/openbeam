import { plural } from "./helpers";

type ActionItem = {
  id: string;
  name: string;
  description: string;
  connectorType: string;
  category: string;
  stakes: string;
  inputs: Array<{
    id: string;
    name: string;
    type: string;
    required: boolean;
    description?: string | null;
  }>;
};

export function formatActionsList(
  actions: ActionItem[],
  connectorType?: string
): string {
  if (actions.length === 0) {
    const scope = connectorType ? ` for ${connectorType}` : "";
    return `No actions available${scope}.`;
  }

  const types = [...new Set(actions.map((a) => a.connectorType))];
  const header = connectorType
    ? `${plural(actions.length, "action")} available for ${connectorType}:`
    : `${plural(actions.length, "action")} across ${plural(types.length, "connector")}:`;

  const byType = new Map<string, ActionItem[]>();
  for (const a of actions) {
    const list = byType.get(a.connectorType) ?? [];
    list.push(a);
    byType.set(a.connectorType, list);
  }

  const sections: string[] = [];
  for (const [type, items] of byType) {
    const rows = items.map((a) => {
      const required = a.inputs
        .filter((i) => i.required)
        .map((i) => i.id)
        .join(", ");
      const reqStr = required ? ` (requires: ${required})` : "";
      return `  • ${a.id}: ${a.name} [${a.category}]${reqStr}`;
    });
    sections.push(`${type}:\n${rows.join("\n")}`);
  }

  const hints = [
    "",
    "To execute an action: use connector_action_execute with connectorId (from connector_list), actionId, and params.",
    "Get the connector ID first by calling connector_list — it shows [ID: xxx] for each connector.",
    "Required params are listed in parentheses above.",
  ].join("\n");

  return `${header}\n\n${sections.join("\n\n")}${hints}`;
}
