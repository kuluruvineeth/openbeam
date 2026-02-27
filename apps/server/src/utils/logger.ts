import { createLogger } from "@openplane/observability";

export const logger = createLogger({
  service: "openplane-server",
  env: process.env.NODE_ENV || "development",
  level: process.env.LOG_LEVEL || "info",
  version: process.env.APP_VERSION || "0.1.0",
});

export default logger;
