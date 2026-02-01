import { startWorker } from "./src/scripts/start-worker";

async function main() {
  try {
    console.log("Starting sync:notion worker...");
    const worker = await startWorker({
      workerType: "sync",
      taskQueue: "sync:notion",
    });
    console.log("Worker created successfully, listening on sync:notion");
    await worker.run();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
