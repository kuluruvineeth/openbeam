type ScopePreset = "all_access" | "read_only" | "restricted";

type ScopeResource = {
  id: string;
  name: string;
  description: string;
  readScope: string;
  writeScope?: string;
  extraScopes?: { label: string; scope: string }[];
};

const SCOPE_RESOURCES: ScopeResource[] = [
  {
    id: "connectors",
    name: "Connectors",
    description: "Manage data source connections and sync operations",
    readScope: "connectors:read",
    writeScope: "connectors:write",
    extraScopes: [{ label: "Sync", scope: "connectors:sync" }],
  },
  {
    id: "search",
    name: "Search",
    description: "Query indexed documents across all sources",
    readScope: "search:read",
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "Access usage metrics and dashboards",
    readScope: "analytics:read",
  },
  {
    id: "teams",
    name: "Teams",
    description: "View and manage team membership and settings",
    readScope: "teams:read",
    writeScope: "teams:write",
  },
  {
    id: "apps",
    name: "Apps",
    description: "Manage installed applications and integrations",
    readScope: "apps:read",
    writeScope: "apps:write",
  },
  {
    id: "rag",
    name: "RAG",
    description: "Access retrieval-augmented generation endpoints",
    readScope: "rag:read",
    writeScope: "rag:write",
  },
  {
    id: "knowledge",
    name: "Knowledge",
    description: "Browse the knowledge base and extracted entities",
    readScope: "knowledge:read",
  },
  {
    id: "media",
    name: "Media",
    description: "Upload and process video, audio, and image files",
    readScope: "media:read",
    writeScope: "media:write",
  },
  {
    id: "agents",
    name: "Agents",
    description: "Create and orchestrate AI agent workflows",
    readScope: "agents:read",
    writeScope: "agents:write",
  },
  {
    id: "canvas",
    name: "Canvas",
    description: "Build and run visual agent pipelines",
    readScope: "canvas:read",
    writeScope: "canvas:write",
    extraScopes: [{ label: "Execute", scope: "canvas:execute" }],
  },
  {
    id: "research",
    name: "Research",
    description: "Run deep research sessions and reports",
    readScope: "research:read",
    writeScope: "research:write",
  },
  {
    id: "context",
    name: "Context",
    description: "Read and write to the context database",
    readScope: "context:read",
    writeScope: "context:write",
  },
];

const ADMIN_SCOPE = "admin:*";

function allScopes(): string[] {
  const scopes: string[] = [];
  for (const resource of SCOPE_RESOURCES) {
    scopes.push(resource.readScope);
    if (resource.writeScope) {
      scopes.push(resource.writeScope);
    }
    if (resource.extraScopes) {
      for (const extra of resource.extraScopes) {
        scopes.push(extra.scope);
      }
    }
  }
  scopes.push(ADMIN_SCOPE);
  return scopes;
}

function readOnlyScopes(): string[] {
  return SCOPE_RESOURCES.map((r) => r.readScope);
}

function scopePresetToScopes(preset: ScopePreset): string[] {
  switch (preset) {
    case "all_access":
      return allScopes();
    case "read_only":
      return readOnlyScopes();
    case "restricted":
      return [];
    default:
      return [];
  }
}

function scopesToPreset(scopes: string[]): ScopePreset {
  const all = allScopes();
  if (all.length === scopes.length && all.every((s) => scopes.includes(s))) {
    return "all_access";
  }
  const readOnly = readOnlyScopes();
  if (
    readOnly.length === scopes.length &&
    readOnly.every((s) => scopes.includes(s))
  ) {
    return "read_only";
  }
  return "restricted";
}

function scopesToDisplayName(scopes: string[]): string {
  const preset = scopesToPreset(scopes);
  switch (preset) {
    case "all_access":
      return "All Access";
    case "read_only":
      return "Read Only";
    case "restricted":
      return `Custom (${scopes.length} scope${scopes.length === 1 ? "" : "s"})`;
    default:
      return "Unknown";
  }
}

type ExpirationOption = { label: string; days: number | null };

const EXPIRATION_OPTIONS: ExpirationOption[] = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "1 year", days: 365 },
  { label: "No expiration", days: null },
];

export type { ScopePreset, ScopeResource, ExpirationOption };
export {
  SCOPE_RESOURCES,
  ADMIN_SCOPE,
  EXPIRATION_OPTIONS,
  scopePresetToScopes,
  scopesToPreset,
  scopesToDisplayName,
};
