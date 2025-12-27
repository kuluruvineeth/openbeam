import prisma, { listTeamsWithConnectors } from "@openplane/db";
import { addReembedJob } from "@openplane/redis";

const BATCH_SIZE = 20;

async function main() {
  console.log("Fetching teams with active connectors...");

  const teams = await listTeamsWithConnectors(prisma, "ACTIVE");

  console.log(`Found ${teams.length} teams with active connectors`);

  for (const team of teams) {
    console.log(`Adding reembed job for team: ${team.name} (${team.id})`);

    await addReembedJob({
      teamId: team.id,
      batchSize: BATCH_SIZE,
    });
  }

  console.log("All reembed jobs queued successfully");
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to trigger reembed:", error);
  process.exit(1);
});
