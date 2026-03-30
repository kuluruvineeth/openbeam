"use client";

import { Icons } from "@/components/icons";

type ScopeItemProps = {
  scope: string;
};

const SCOPE_LABELS: Record<
  string,
  { label: string; icon: "read" | "write" | "execute" | "admin" }
> = {
  "connectors:read": {
    label: "View your connected data sources",
    icon: "read",
  },
  "connectors:write": {
    label: "Manage your connected data sources",
    icon: "write",
  },
  "connectors:sync": { label: "Trigger data syncs", icon: "execute" },
  "search:read": { label: "Search across your data", icon: "read" },
  "analytics:read": { label: "View analytics and usage data", icon: "read" },
  "teams:read": { label: "View team information", icon: "read" },
  "teams:write": { label: "Manage team settings", icon: "write" },
  "apps:read": { label: "View installed applications", icon: "read" },
  "apps:write": { label: "Manage installed applications", icon: "write" },
  "rag:read": { label: "Query knowledge base", icon: "read" },
  "rag:write": { label: "Update knowledge base", icon: "write" },
  "knowledge:read": { label: "Access knowledge graph", icon: "read" },
  "permissions:read": { label: "View access permissions", icon: "read" },
  "permissions:write": { label: "Manage access permissions", icon: "write" },
  "media:read": { label: "View media files", icon: "read" },
  "media:write": { label: "Upload and manage media", icon: "write" },
  "agents:read": { label: "View AI agents", icon: "read" },
  "agents:write": { label: "Create and manage AI agents", icon: "write" },
  "canvas:read": { label: "View canvas workflows", icon: "read" },
  "canvas:write": { label: "Edit canvas workflows", icon: "write" },
  "canvas:execute": { label: "Run canvas workflows", icon: "execute" },
  "research:read": { label: "View research results", icon: "read" },
  "research:write": { label: "Create research tasks", icon: "write" },
  "control:read": { label: "View control plane data", icon: "read" },
  "control:write": { label: "Manage control plane", icon: "write" },
  "control:execute": {
    label: "Execute control plane actions",
    icon: "execute",
  },
  "context:read": { label: "Read context database", icon: "read" },
  "context:write": { label: "Write to context database", icon: "write" },
  "admin:*": { label: "Full administrative access", icon: "admin" },
};

function ScopeIcon({ type }: { type: "read" | "write" | "execute" | "admin" }) {
  switch (type) {
    case "read":
      return <Icons.Eye className="text-muted-foreground" size={14} />;
    case "write":
      return <Icons.Pencil className="text-muted-foreground" size={14} />;
    case "execute":
      return <Icons.Play className="text-muted-foreground" size={14} />;
    case "admin":
      return <Icons.ShieldAlert className="text-destructive" size={14} />;
    default:
      return <Icons.Eye className="text-muted-foreground" size={14} />;
  }
}

export function OAuthScopeItem({ scope }: ScopeItemProps) {
  const info = SCOPE_LABELS[scope];
  const label = info?.label ?? scope;
  const iconType = info?.icon ?? "read";

  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <ScopeIcon type={iconType} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
