import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

const DAEMON_PATH_PREFIX = "/daemon";
const SERVER_ID_PATTERN = /^\/daemon\/([^/]+)/;
const AGENT_ROUTE_PATTERN = /^\/daemon\/([^/]+)\/agent\/([^/]+)/;
const AGENT_DRAFT_PATTERN = /^\/daemon\/([^/]+)\/agent\/([^/]+)\/draft$/;

export function buildDaemonAgentsRoute(serverId: string): string {
  return `${DAEMON_PATH_PREFIX}/${serverId}`;
}

export function buildDaemonAgentDetailRoute(
  serverId: string,
  agentId: string
): string {
  return `${DAEMON_PATH_PREFIX}/${serverId}/agent/${agentId}`;
}

export function buildDaemonAgentDraftRoute(
  serverId: string,
  agentId: string
): string {
  return `${DAEMON_PATH_PREFIX}/${serverId}/agent/${agentId}/draft`;
}

export function buildDaemonSettingsRoute(serverId: string): string {
  return `${DAEMON_PATH_PREFIX}/${serverId}/settings`;
}

interface HostAgentRoute {
  serverId: string;
  agentId: string;
}

interface HostAgentDraftRoute extends HostAgentRoute {
  isDraft: true;
}

export function parseServerIdFromPathname(pathname: string): string | null {
  const match = pathname.match(SERVER_ID_PATTERN);
  return match?.[1] ?? null;
}

export function parseHostAgentRouteFromPathname(
  pathname: string
): HostAgentRoute | null {
  const match = pathname.match(AGENT_ROUTE_PATTERN);
  if (!(match?.[1] && match[2])) {
    return null;
  }
  return { serverId: match[1], agentId: match[2] };
}

export function parseHostAgentDraftRouteFromPathname(
  pathname: string
): HostAgentDraftRoute | null {
  const match = pathname.match(AGENT_DRAFT_PATTERN);
  if (!(match?.[1] && match[2])) {
    return null;
  }
  return { serverId: match[1], agentId: match[2], isDraft: true };
}

export function mapPathnameToServer(
  pathname: string,
  targetServerId: string
): string {
  const currentServerId = parseServerIdFromPathname(pathname);
  if (!currentServerId) {
    return buildDaemonAgentsRoute(targetServerId);
  }
  return pathname.replace(
    `/daemon/${currentServerId}`,
    `/daemon/${targetServerId}`
  );
}

// biome-ignore lint/suspicious/noExplicitAny: route type cast for Next.js router compatibility
type AnyRoute = any;

export function daemonNavigate(
  router: AppRouterInstance,
  route: string,
  mode: "push" | "replace" = "push"
): void {
  if (mode === "replace") {
    router.replace(route as AnyRoute);
  } else {
    router.push(route as AnyRoute);
  }
}
