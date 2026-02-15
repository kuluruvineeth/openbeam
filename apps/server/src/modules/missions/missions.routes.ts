import { createRoute } from "@hono/zod-openapi";
import {
  broadcastBodySchema,
  broadcastResponseSchema,
  createMissionBodySchema,
  errorSchema,
  listMissionsQuerySchema,
  missionIdParamsSchema,
  spawnAgentBodySchema,
  spawnAgentResponseSchema,
  startMissionResponseSchema,
  successSchema,
  unknownResponseSchema,
  updateMissionBodySchema,
} from "./missions.schema";

const tags = ["Missions"];

export const listMissionsRoute = createRoute({
  tags,
  method: "get",
  path: "/",
  summary: "List missions",
  request: {
    query: listMissionsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: unknownResponseSchema,
        },
      },
      description: "Mission board listed",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
  },
});

export const createMissionRoute = createRoute({
  tags,
  method: "post",
  path: "/",
  summary: "Create mission",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createMissionBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: unknownResponseSchema,
        },
      },
      description: "Mission created",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
  },
});

export const getMissionRoute = createRoute({
  tags,
  method: "get",
  path: "/{id}",
  summary: "Get mission",
  request: {
    params: missionIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: unknownResponseSchema,
        },
      },
      description: "Mission fetched",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Mission not found",
    },
  },
});

export const updateMissionRoute = createRoute({
  tags,
  method: "patch",
  path: "/{id}",
  summary: "Update mission",
  request: {
    params: missionIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: updateMissionBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: unknownResponseSchema,
        },
      },
      description: "Mission updated",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Mission not found",
    },
  },
});

export const startMissionRoute = createRoute({
  tags,
  method: "post",
  path: "/{id}/start",
  summary: "Start mission",
  request: {
    params: missionIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: startMissionResponseSchema,
        },
      },
      description: "Mission started",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Mission not found",
    },
  },
});

export const pauseMissionRoute = createRoute({
  tags,
  method: "post",
  path: "/{id}/pause",
  summary: "Pause mission",
  request: {
    params: missionIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: successSchema,
        },
      },
      description: "Mission paused",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Mission not found",
    },
  },
});

export const resumeMissionRoute = createRoute({
  tags,
  method: "post",
  path: "/{id}/resume",
  summary: "Resume mission",
  request: {
    params: missionIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: successSchema,
        },
      },
      description: "Mission resumed",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Mission not found",
    },
  },
});

export const cancelMissionRoute = createRoute({
  tags,
  method: "post",
  path: "/{id}/cancel",
  summary: "Cancel mission",
  request: {
    params: missionIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: successSchema,
        },
      },
      description: "Mission cancelled",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Mission not found",
    },
  },
});

export const spawnMissionAgentRoute = createRoute({
  tags,
  method: "post",
  path: "/{id}/agents/spawn",
  summary: "Spawn mission agent",
  request: {
    params: missionIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: spawnAgentBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: spawnAgentResponseSchema,
        },
      },
      description: "Mission agent spawned",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Mission or task not found",
    },
  },
});

export const broadcastMissionRoute = createRoute({
  tags,
  method: "post",
  path: "/{id}/broadcast",
  summary: "Broadcast mission message",
  request: {
    params: missionIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: broadcastBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: broadcastResponseSchema,
        },
      },
      description: "Mission message broadcasted",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Mission not found",
    },
  },
});
