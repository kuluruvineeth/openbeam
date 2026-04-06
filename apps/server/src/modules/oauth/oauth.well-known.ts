import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";

const API_URL = process.env.OPENBEAM_API_URL || "https://api.openbeam.work";
const APP_URL = process.env.OPENBEAM_APP_URL || "https://app.openbeam.work";

const allScopes = Object.values(API_SCOPES);

const wellKnown = new OpenAPIHono<AuthEnv>();

wellKnown.get("/.well-known/oauth-protected-resource", (c) =>
  c.json({
    resource: API_URL,
    authorization_servers: [API_URL],
    scopes_supported: allScopes,
    bearer_methods_supported: ["header"],
    resource_documentation: "https://docs.openbeam.work",
  })
);

wellKnown.get("/.well-known/oauth-authorization-server", (c) =>
  c.json({
    issuer: API_URL,
    authorization_endpoint: `${APP_URL}/oauth/authorize`,
    token_endpoint: `${API_URL}/oauth/token`,
    registration_endpoint: `${API_URL}/oauth/register`,
    revocation_endpoint: `${API_URL}/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: allScopes,
  })
);

export default wellKnown;
