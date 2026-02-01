import {
  awaitSyncCompletion,
  getSyncProgress,
  startConnectorSync,
} from "./src/triggers/sync";

async function main() {
  const connectorId = process.argv[2];

  if (!connectorId) {
    console.log("Usage: bun run trigger-test-sync.ts <connectorId>");
    console.log("\nTo find a connector ID, check the database or use:");
    console.log(
      "  SELECT id, type FROM connectors WHERE type = 'notion' LIMIT 1;"
    );
    process.exit(1);
  }

  console.log(`Starting sync for connector: ${connectorId}`);

  try {
    const handle = await startConnectorSync({
      connectorId,
      connectorType: "notion",
      syncType: "FULL",
      trigger: "MANUAL",
    });

    console.log(`Workflow started: ${handle.workflowId}`);
    console.log(`Run ID: ${handle.runId}`);

    console.log("\nMonitoring progress...");

    let lastProcessed = 0;
    const checkInterval = setInterval(async () => {
      const progress = await getSyncProgress(handle.workflowId);
      if (progress && progress.processed !== lastProcessed) {
        lastProcessed = progress.processed;
        console.log(
          `  Stage: ${progress.stage}, Processed: ${progress.processed}, Indexed: ${progress.indexed}, Errors: ${progress.errors}`
        );
      }
    }, 2000);

    console.log("\nWaiting for completion...");
    const result = await awaitSyncCompletion(handle.workflowId);

    clearInterval(checkInterval);

    if (result) {
      console.log("\n✅ Sync completed!");
      console.log(`  Processed: ${result.processed}`);
      console.log(`  Indexed: ${result.indexed}`);
      console.log(`  Errors: ${result.errors}`);
      console.log(`  Duration: ${result.duration}ms`);
    } else {
      console.log("\n❌ Workflow not found or failed");
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
