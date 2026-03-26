import type { PullAuthConfig } from "@openbeam/types/services/connectors/custom-pull";
import { getValidAccessToken } from "../../lib/token-refresh";

export interface ResolvedAuth {
  headers: Record<string, string>;
  queryParams: Record<string, string>;
}

export async function resolveAuth(auth: PullAuthConfig): Promise<ResolvedAuth> {
  const headers: Record<string, string> = {};
  const queryParams: Record<string, string> = {};

  switch (auth.type) {
    case "api_key": {
      if (auth.headerName) {
        headers[auth.headerName] = auth.value;
      } else if (auth.queryParamName) {
        queryParams[auth.queryParamName] = auth.value;
      } else {
        headers["X-API-Key"] = auth.value;
      }
      break;
    }
    case "bearer": {
      headers.Authorization = `Bearer ${auth.token}`;
      break;
    }
    case "basic": {
      const encoded = btoa(`${auth.username}:${auth.password}`);
      headers.Authorization = `Basic ${encoded}`;
      break;
    }
    case "oauth2": {
      const accessToken = await getValidAccessToken(auth.connectorId);
      headers.Authorization = `Bearer ${accessToken}`;
      break;
    }
    case "custom_headers": {
      for (const [key, value] of Object.entries(auth.headers)) {
        headers[key] = value;
      }
      break;
    }
    default: {
      const _exhaustive: never = auth;
      throw new Error(
        `Unknown auth type: ${(_exhaustive as PullAuthConfig).type}`
      );
    }
  }

  return { headers, queryParams };
}
