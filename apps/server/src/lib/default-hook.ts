import type { Hook } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";

// biome-ignore lint/suspicious/noExplicitAny: Hook type requires any for generic validation
export const defaultHook: Hook<any, AuthEnv, any, any> = (result, c) => {
  if (!result.success) {
    return c.json(
      {
        success: false,
        error: "Validation Failed",
        issues: result.error.issues,
      },
      422
    );
  }
};
