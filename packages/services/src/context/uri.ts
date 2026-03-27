import { createHash } from "node:crypto";
import type { ContextScope } from "@openbeam/types/context";

const URI_PREFIX = "openbeam://";
const VALID_SCOPES = new Set<string>([
  "session",
  "user",
  "agent",
  "resources",
  "tools",
]);

function assertValidUri(uri: string): void {
  if (!uri.startsWith(URI_PREFIX)) {
    throw new Error(`Invalid context URI: must start with ${URI_PREFIX}`);
  }
}

function stripTrailingSlash(uri: string): string {
  return uri.endsWith("/") ? uri.slice(0, -1) : uri;
}

export function parseUri(uri: string): {
  scope: ContextScope;
  teamId: string;
  segments: string[];
} {
  assertValidUri(uri);

  const path = stripTrailingSlash(uri.slice(URI_PREFIX.length));
  const parts = path.split("/").filter(Boolean);

  if (parts.length < 2) {
    throw new Error(
      `Invalid context URI: must have at least scope and teamId (got "${uri}")`
    );
  }

  const scope = parts[0];
  const teamId = parts[1];

  if (scope === undefined || teamId === undefined) {
    throw new Error(
      `Invalid context URI: must have at least scope and teamId (got "${uri}")`
    );
  }

  if (!VALID_SCOPES.has(scope)) {
    throw new Error(
      `Invalid context URI scope: "${scope}" (valid: ${[...VALID_SCOPES].join(", ")})`
    );
  }

  return {
    scope: scope as ContextScope,
    teamId,
    segments: parts.slice(2),
  };
}

export function buildUri(
  scope: ContextScope,
  teamId: string,
  ...segments: string[]
): string {
  const parts = [scope, teamId, ...segments].filter(Boolean);
  return `${URI_PREFIX}${parts.join("/")}`;
}

export function getParentUri(uri: string): string | null {
  assertValidUri(uri);

  const path = stripTrailingSlash(uri.slice(URI_PREFIX.length));
  const parts = path.split("/").filter(Boolean);

  if (parts.length <= 2) {
    return null;
  }

  return `${URI_PREFIX}${parts.slice(0, -1).join("/")}`;
}

export function isDescendant(parentUri: string, childUri: string): boolean {
  assertValidUri(parentUri);
  assertValidUri(childUri);

  const normalizedParent = stripTrailingSlash(parentUri);
  const normalizedChild = stripTrailingSlash(childUri);

  if (normalizedParent === normalizedChild) {
    return false;
  }

  return normalizedChild.startsWith(`${normalizedParent}/`);
}

export function getScopeFromUri(uri: string): ContextScope {
  return parseUri(uri).scope;
}

export function generateEntryId(teamId: string, uri: string): string {
  return createHash("md5").update(`${teamId}:${uri}`).digest("hex");
}
