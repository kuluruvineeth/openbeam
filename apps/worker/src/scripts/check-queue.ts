import { getReembedQueueMetrics } from "@openplane/redis";

async function check() {
  const metrics = await getReembedQueueMetrics();
  console.log("\n=== Reembed Queue Status ===\n");
  console.log(JSON.stringify(metrics, null, 2));
}

check().catch(console.error);
