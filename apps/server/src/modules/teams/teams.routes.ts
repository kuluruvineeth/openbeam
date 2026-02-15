import { createRoute } from "@hono/zod-openapi";
import {
  createTeamApiKeyBodySchema,
  createTeamApiKeyResponseSchema,
  createTeamBodySchema,
  createTeamResponseSchema,
  errorSchema,
  listTeamApiKeysResponseSchema,
  listTeamsResponseSchema,
  revokeTeamApiKeyResponseSchema,
  switchTeamResponseSchema,
  teamApiKeyParamsSchema,
  teamIdParamsSchema,
  teamRoleResponseSchema,
} from "./teams.schema";

const tags = ["Teams"];

export const listTeamsRoute = createRoute({
  tags,
  method: "get",
  path: "/",
  summary: "List teams",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: listTeamsResponseSchema,
        },
      },
      description: "Teams listed successfully",
    },
    401: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Unauthorized",
    },
  },
});

export const createTeamRoute = createRoute({
  tags,
  method: "post",
  path: "/",
  summary: "Create team",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createTeamBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: createTeamResponseSchema,
        },
      },
      description: "Team created successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
    401: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Unauthorized",
    },
    403: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Forbidden",
    },
    409: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Conflict",
    },
  },
});

export const switchTeamRoute = createRoute({
  tags,
  method: "post",
  path: "/{id}/switch",
  summary: "Switch active team",
  request: {
    params: teamIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: switchTeamResponseSchema,
        },
      },
      description: "Active team switched",
    },
    401: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Unauthorized",
    },
    403: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Forbidden",
    },
  },
});

export const getTeamRoleRoute = createRoute({
  tags,
  method: "get",
  path: "/{id}/role",
  summary: "Get team role",
  request: {
    params: teamIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: teamRoleResponseSchema,
        },
      },
      description: "Role resolved successfully",
    },
    401: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Unauthorized",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Membership not found",
    },
  },
});

export const listTeamApiKeysRoute = createRoute({
  tags,
  method: "get",
  path: "/{id}/api-keys",
  summary: "List team API keys",
  request: {
    params: teamIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: listTeamApiKeysResponseSchema,
        },
      },
      description: "Team API keys listed",
    },
    401: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Unauthorized",
    },
    403: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Forbidden",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Not found",
    },
    500: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Internal server error",
    },
  },
});

export const createTeamApiKeyRoute = createRoute({
  tags,
  method: "post",
  path: "/{id}/api-keys",
  summary: "Create a team API key",
  request: {
    params: teamIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: createTeamApiKeyBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: createTeamApiKeyResponseSchema,
        },
      },
      description: "Team API key created",
    },
    401: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Unauthorized",
    },
    403: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Forbidden",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Not found",
    },
    500: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Internal server error",
    },
  },
});

export const revokeTeamApiKeyRoute = createRoute({
  tags,
  method: "delete",
  path: "/{id}/api-keys/{keyId}",
  summary: "Revoke a team API key",
  request: {
    params: teamApiKeyParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: revokeTeamApiKeyResponseSchema,
        },
      },
      description: "Team API key revoked",
    },
    401: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Unauthorized",
    },
    403: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Forbidden",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "API key not found",
    },
    500: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Internal server error",
    },
  },
});
