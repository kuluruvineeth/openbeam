import dotenv from "dotenv";

dotenv.config({ path: "./apps/server/.env" });

import { startConnectorSync } from "@openbeam/temporal";

async function main() {
  const connectorId = process.argv[2];
  const connectorType = process.argv[3];

  if (!(connectorId && connectorType)) {
    console.error("Usage: trigger-sync.ts <connectorId> <connectorType>");
    process.exit(1);
  }

  console.log(`Triggering FULL sync for ${connectorType} (${connectorId})...`);

  const handle = await startConnectorSync({
    connectorId,
    connectorType,
    syncType: "FULL",
    trigger: "MANUAL",
  });

  console.log(`Workflow started: ${handle.workflowId} (run: ${handle.runId})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
