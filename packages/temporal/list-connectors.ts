import "dotenv/config";
import db from "@openplane/db";

async function main() {
  const connectors = await db.connector.findMany({
    where: { app: "NOTION" },
    select: { id: true, type: true, teamId: true, name: true, status: true },
    take: 5,
  });

  if (connectors.length === 0) {
    console.log("No Notion connectors found in database.");
    console.log("\nTo create one, set up a Notion integration first.");
  } else {
    console.log("Notion connectors:");
    for (const c of connectors) {
      console.log(`  - ${c.id} (${c.name || "unnamed"}) - ${c.status}`);
    }
    const firstConnector = connectors[0];
    if (firstConnector) {
      console.log(`\nUse: bun run trigger-test-sync.ts ${firstConnector.id}`);
    }
  }

  await db.$disconnect();
}

main().catch(console.error);
