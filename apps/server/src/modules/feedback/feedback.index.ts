import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import { ipRateLimit } from "@/middleware/rate-limit";
import { createFeedbackHandler } from "./feedback.handlers";
import { createFeedbackRoute } from "./feedback.routes";

const feedbackApp = new OpenAPIHono<AuthEnv>();

feedbackApp.use(
  "/*",
  ipRateLimit({
    burstLimit: 3,
    burstWindow: 60,
    minuteLimit: 10,
    minuteWindow: 3600,
  })
);

feedbackApp.openapi(createFeedbackRoute, createFeedbackHandler);

export default feedbackApp;
