import "dotenv/config";
import { createSandboxApi } from "@openplane/sandbox";

const app = createSandboxApi();
const port = Number.parseInt(process.env.PORT ?? "3800", 10);

const server = Bun.serve({
  port,
  fetch: app.fetch,
  idleTimeout: 120,
});

console.log(`Sandbox gateway running on http://localhost:${server.port}`);
