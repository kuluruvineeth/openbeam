import type { Database } from "@openbeam/db";
import { findContextEntry, listContextChildren } from "@openbeam/db";
import type { ContextEntry } from "@openbeam/types/context";

interface ContextResourceTemplate {
  uriTemplate: string;
  name: string;
  description: string;
  mimeType: string;
}

const RESOURCE_TEMPLATES: ContextResourceTemplate[] = [
  {
    uriTemplate: "openbeam://resources/{teamId}/",
    name: "Enterprise Resources",
    description: "All synced enterprise documents and knowledge",
    mimeType: "application/json",
  },
  {
    uriTemplate: "openbeam://user/{teamId}/{userId}/memories/",
    name: "User Memories",
    description: "User's accumulated knowledge, preferences, and context",
    mimeType: "application/json",
  },
  {
    uriTemplate: "openbeam://agent/{teamId}/{agentId}/skills/",
    name: "Agent Skills",
    description: "Agent's learned capabilities and execution patterns",
    mimeType: "application/json",
  },
  {
    uriTemplate: "openbeam://tools/{teamId}/",
    name: "Available Tools",
    description: "Tool definitions and execution statistics",
    mimeType: "application/json",
  },
];

const URI_PREFIX = "openbeam://";
const TRAILING_SLASH_RE = /\/$/;

const SCOPE_PATTERNS: Array<{
  regex: RegExp;
  scope: string;
  extractTeamId: (match: RegExpMatchArray) => string;
  extractParentUri: (match: RegExpMatchArray) => string;
}> = [
  {
    regex: /^openbeam:\/\/resources\/([^/]+)\/?(.*)$/,
    scope: "resources",
    extractTeamId: (m) => m[1] ?? "",
    extractParentUri: (m) => {
      const rest = m[2];
      const teamId = m[1] ?? "";
      return rest
        ? `openbeam://resources/${teamId}/${rest.replace(TRAILING_SLASH_RE, "")}`
        : `openbeam://resources/${teamId}`;
    },
  },
  {
    regex: /^openbeam:\/\/user\/([^/]+)\/([^/]+)\/memories\/?(.*)$/,
    scope: "user",
    extractTeamId: (m) => m[1] ?? "",
    extractParentUri: (m) => {
      const rest = m[3];
      const teamId = m[1] ?? "";
      const userId = m[2] ?? "";
      return rest
        ? `openbeam://user/${teamId}/${userId}/memories/${rest.replace(TRAILING_SLASH_RE, "")}`
        : `openbeam://user/${teamId}/${userId}/memories`;
    },
  },
  {
    regex: /^openbeam:\/\/agent\/([^/]+)\/([^/]+)\/skills\/?(.*)$/,
    scope: "agent",
    extractTeamId: (m) => m[1] ?? "",
    extractParentUri: (m) => {
      const rest = m[3];
      const teamId = m[1] ?? "";
      const agentId = m[2] ?? "";
      return rest
        ? `openbeam://agent/${teamId}/${agentId}/skills/${rest.replace(TRAILING_SLASH_RE, "")}`
        : `openbeam://agent/${teamId}/${agentId}/skills`;
    },
  },
  {
    regex: /^openbeam:\/\/tools\/([^/]+)\/?(.*)$/,
    scope: "tools",
    extractTeamId: (m) => m[1] ?? "",
    extractParentUri: (m) => {
      const rest = m[2];
      const teamId = m[1] ?? "";
      return rest
        ? `openbeam://tools/${teamId}/${rest.replace(TRAILING_SLASH_RE, "")}`
        : `openbeam://tools/${teamId}`;
    },
  },
];

function parseContextUri(
  uri: string
): { teamId: string; parentUri: string; scope: string } | null {
  for (const pattern of SCOPE_PATTERNS) {
    const match = uri.match(pattern.regex);
    if (match) {
      return {
        teamId: pattern.extractTeamId(match),
        parentUri: pattern.extractParentUri(match),
        scope: pattern.scope,
      };
    }
  }
  return null;
}

function isDirectoryUri(uri: string): boolean {
  return uri.endsWith("/");
}

function stripTrailingSlash(uri: string): string {
  return uri.endsWith("/") ? uri.slice(0, -1) : uri;
}

function formatEntry(entry: ContextEntry, level: "l1" | "l2" = "l1") {
  const base = {
    uri: entry.uri,
    contextType: entry.contextType,
    category: entry.category,
    isLeaf: entry.isLeaf,
    abstract: entry.abstractText,
    activeCount: entry.activeCount,
    updatedAt: entry.updatedAt.toISOString(),
  };

  if (level === "l2") {
    return {
      ...base,
      overview: entry.overview,
      content: entry.content,
      createdAt: entry.createdAt.toISOString(),
      ownerId: entry.ownerId,
      ownerType: entry.ownerType,
    };
  }

  return {
    ...base,
    overview: entry.overview,
  };
}

function jsonResponse(uri: string, data: unknown) {
  return {
    contents: [
      {
        uri,
        mimeType: "application/json" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function errorResponse(uri: string, message: string) {
  return jsonResponse(uri, { error: message });
}

export function getContextResourceTemplates(): ContextResourceTemplate[] {
  return RESOURCE_TEMPLATES;
}

export function isContextUri(uri: string): boolean {
  return uri.startsWith(URI_PREFIX) && parseContextUri(uri) !== null;
}

export async function readContextResource(
  db: Database,
  uri: string
): Promise<{
  contents: Array<{ uri: string; mimeType: string; text: string }>;
}> {
  const parsed = parseContextUri(uri);
  if (!parsed) {
    return errorResponse(uri, `Invalid context URI: ${uri}`);
  }

  const { teamId, parentUri } = parsed;
  const normalizedUri = stripTrailingSlash(uri);

  if (isDirectoryUri(uri)) {
    const children = await listContextChildren(db, teamId, parentUri);

    return jsonResponse(uri, {
      uri: normalizedUri,
      entries: (children as ContextEntry[]).map((child) => formatEntry(child)),
      count: children.length,
    });
  }

  const entry = await findContextEntry(db, teamId, normalizedUri);
  if (!entry) {
    return errorResponse(uri, `Context entry not found: ${normalizedUri}`);
  }

  const typedEntry = entry as ContextEntry;

  if (!typedEntry.isLeaf) {
    const children = await listContextChildren(db, teamId, normalizedUri);

    return jsonResponse(uri, {
      ...formatEntry(typedEntry),
      children: (children as ContextEntry[]).map((child) => formatEntry(child)),
    });
  }

  const hasDetailParam = uri.includes("?level=l2");
  const level = hasDetailParam ? "l2" : "l1";

  return jsonResponse(uri, formatEntry(typedEntry, level));
}
