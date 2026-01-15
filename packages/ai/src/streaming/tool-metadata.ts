import type { AgentStatus, ToolVisibility } from "@openplane/types/ai";

export interface ToolMetadata {
  displayName: string;
  visibility: ToolVisibility;
  status?: AgentStatus;
  statusMessage?: string;
  category?: string;
}

export interface ToolMetadataInput {
  displayName?: string;
  visibility?: ToolVisibility;
  status?: AgentStatus;
  statusMessage?: string;
  category?: string;
}

const registry = new Map<string, ToolMetadata>();

export function registerToolMetadata(
  toolName: string,
  metadata: Partial<ToolMetadata>
): void {
  const displayName = metadata.displayName ?? formatToolName(toolName);
  registry.set(toolName, {
    displayName,
    visibility: metadata.visibility ?? "visible",
    status: metadata.status,
    statusMessage: metadata.statusMessage ?? deriveStatusMessage(displayName),
    category: metadata.category,
  });
}

export function getToolMetadata(toolName: string): ToolMetadata {
  const existing = registry.get(toolName);
  if (existing) {
    return existing;
  }
  const displayName = formatToolName(toolName);
  return {
    displayName,
    visibility: "visible",
    statusMessage: deriveStatusMessage(displayName),
  };
}

export function isEphemeral(toolName: string): boolean {
  return getToolMetadata(toolName).visibility === "ephemeral";
}

export function isHidden(toolName: string): boolean {
  return getToolMetadata(toolName).visibility === "hidden";
}

export function getDisplayName(toolName: string): string {
  return getToolMetadata(toolName).displayName;
}

export function getStatusForTool(
  toolName: string
): { status: AgentStatus; message: string } | null {
  const meta = getToolMetadata(toolName);
  if (meta.status) {
    return {
      status: meta.status,
      message: meta.statusMessage ?? deriveStatusMessage(meta.displayName),
    };
  }
  return null;
}

export function clearRegistry(): void {
  registry.clear();
}

export function getRegisteredToolCount(): number {
  return registry.size;
}

function formatToolName(toolName: string): string {
  return toolName
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function deriveStatusMessage(displayName: string): string {
  const lower = displayName.toLowerCase();
  if (lower.endsWith("...")) {
    return displayName;
  }
  if (lower.endsWith("ing")) {
    return `${displayName}...`;
  }
  return `${displayName}...`;
}
