import { z } from "zod";

export const ConnectorTypeSchema = z.enum([
  "slack",
  "linear",
  "notion",
  "gmail",
  "google-drive",
]);

export type ConnectorTypeForResources = z.infer<typeof ConnectorTypeSchema>;

export const CONNECTOR_RESOURCE_TYPES = {
  slack: ["public_channel", "private_channel", "dm", "mpim"] as const,
  linear: ["team", "project"] as const,
  notion: ["database", "page", "workspace"] as const,
  gmail: ["label", "system_label"] as const,
  "google-drive": ["my_drive", "shared_drive"] as const,
} as const;

export type ConnectorResourceTypes = typeof CONNECTOR_RESOURCE_TYPES;

export type ResourceTypeForConnector<T extends ConnectorTypeForResources> =
  (typeof CONNECTOR_RESOURCE_TYPES)[T][number];

export function getResourceTypesForConnector(
  connectorType: ConnectorTypeForResources
): readonly string[] {
  return CONNECTOR_RESOURCE_TYPES[connectorType] ?? [];
}

export function getResourceLabel(resourceType: string): string {
  const labels: Record<string, string> = {
    public_channel: "Channel",
    private_channel: "Private Channel",
    dm: "Direct Message",
    mpim: "Group DM",
    team: "Team",
    project: "Project",
    database: "Database",
    page: "Page",
    workspace: "Workspace",
    label: "Label",
    system_label: "System Label",
    my_drive: "My Drive",
    shared_drive: "Shared Drive",
  };
  return labels[resourceType] ?? resourceType;
}

export function getResourcePlaceholder(resourceType: string): string {
  const placeholders: Record<string, string> = {
    public_channel: "Select a channel...",
    private_channel: "Select a private channel...",
    dm: "Select a DM...",
    mpim: "Select a group DM...",
    team: "Select a team...",
    project: "Select a project...",
    database: "Select a database...",
    page: "Select a page...",
    workspace: "Select a workspace...",
    label: "Select a label...",
    system_label: "Select a system label...",
    my_drive: "Select My Drive...",
    shared_drive: "Select a shared drive...",
  };
  return placeholders[resourceType] ?? `Select a ${resourceType}...`;
}

export const RESOURCE_REQUIREMENTS: Record<
  string,
  { requiresResource: boolean; resourceTypes: readonly string[] }
> = {
  "message.created": {
    requiresResource: true,
    resourceTypes: ["public_channel", "private_channel", "dm", "mpim"],
  },
  "message.updated": {
    requiresResource: true,
    resourceTypes: ["public_channel", "private_channel", "dm", "mpim"],
  },
  "message.deleted": {
    requiresResource: true,
    resourceTypes: ["public_channel", "private_channel", "dm", "mpim"],
  },
  "reaction.added": {
    requiresResource: true,
    resourceTypes: ["public_channel", "private_channel"],
  },
  "reaction.removed": {
    requiresResource: true,
    resourceTypes: ["public_channel", "private_channel"],
  },
  "issue.created": {
    requiresResource: false,
    resourceTypes: ["team", "project"],
  },
  "issue.updated": {
    requiresResource: false,
    resourceTypes: ["team", "project"],
  },
  "page.created": { requiresResource: false, resourceTypes: ["database"] },
  "page.updated": { requiresResource: false, resourceTypes: ["database"] },
  "email.received": {
    requiresResource: false,
    resourceTypes: ["label", "system_label"],
  },
  "file.created": {
    requiresResource: false,
    resourceTypes: ["my_drive", "shared_drive"],
  },
  "file.updated": {
    requiresResource: false,
    resourceTypes: ["my_drive", "shared_drive"],
  },
};

export function getEventResourceRequirements(
  eventId: string
): { requiresResource: boolean; resourceTypes: readonly string[] } | undefined {
  return RESOURCE_REQUIREMENTS[eventId];
}
