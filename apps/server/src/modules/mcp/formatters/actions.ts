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
    return [
      `No actions available${scope}.`,
      "",
      "Next steps:",
      "• List all actions: connector_actions_list without filters to see all available actions.",
      "• Check connectors: connector_list to see which data sources are connected.",
    ].join("\n");
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
    "Next steps:",
    "• Execute an action: connector_action_execute with connectorId, actionId, and params matching the inputs above.",
    "• Get connector IDs: connector_list shows [ID: xxx] for each connector — you need the ID to execute actions.",
    "• Required params are listed in parentheses above. Optional params can be omitted.",
    "• View connector details: connector_get with a connector ID for more context before executing.",
  ].join("\n");

  return `${header}\n\n${sections.join("\n\n")}${hints}`;
}

export function formatActionExecute(
  actionId: string,
  success: boolean,
  data: unknown,
  error?: string | null
): string {
  if (!success) {
    return [
      `Action "${actionId}" failed: ${error ?? "unknown error"}`,
      "",
      "Next steps:",
      "• Check parameters: connector_actions_list to verify required inputs for this action.",
      "• Retry with corrections if a required parameter was missing or invalid.",
    ].join("\n");
  }

  const parts: string[] = [`Action "${actionId}" executed successfully.`];

  if (data != null) {
    const formatted =
      typeof data === "string" ? data : JSON.stringify(data, null, 2);
    const preview =
      formatted.length > 500 ? `${formatted.slice(0, 500)}...` : formatted;
    parts.push("", `Result:\n${preview}`);
  }

  parts.push(
    "",
    "Next steps:",
    "• Run another action: connector_actions_list to discover more actions.",
    "• Search related docs: search_documents with keywords from the result."
  );

  return parts.join("\n");
}
