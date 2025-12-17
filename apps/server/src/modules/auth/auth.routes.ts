import { createRoute, z } from "@hono/zod-openapi";

export const signinRoute = createRoute({
  method: "get",
  path: "/signin/:provider",
  tags: ["Auth"],
  request: {
    params: z.object({
      provider: z.string().openapi({ example: "google" }),
    }),
    query: z.object({
      callbackUrl: z.string().url().optional(),
    }),
  },
  responses: {
    302: { description: "Redirect to OAuth provider" },
    400: {
      description: "Invalid provider",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

export const callbackRoute = createRoute({
  method: "get",
  path: "/callback/:provider",
  tags: ["Auth"],
  request: {
    params: z.object({
      provider: z.string().openapi({ example: "google" }),
    }),
    query: z.object({
      code: z.string(),
      state: z.string(),
      error: z.string().optional(),
    }),
  },
  responses: {
    302: { description: "Redirect to web app" },
    400: {
      description: "OAuth error",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

export const signoutRoute = createRoute({
  method: "post",
  path: "/signout",
  tags: ["Auth"],
  responses: {
    200: {
      description: "Signed out successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
  },
});

export const sessionRoute = createRoute({
  method: "get",
  path: "/session",
  tags: ["Auth"],
  responses: {
    200: {
      description: "Current session",
      content: {
        "application/json": {
          schema: z.object({
            user: z
              .object({
                id: z.string(),
                email: z.string(),
                name: z.string(),
                image: z.string().nullable(),
              })
              .nullable(),
          }),
        },
      },
    },
  },
});
