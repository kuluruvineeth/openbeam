import { addReembedJob } from "@openplane/redis";

// From Vespa results: team cmit15cnz0000vn7zmt52gcxc has 958 docs needing embedding
const TEAM_ID = "cmit15cnz0000vn7zmt52gcxc";

async function trigger() {
  console.log(`Triggering reembed for team ${TEAM_ID}`);
  const job = await addReembedJob({ teamId: TEAM_ID, batchSize: 20 });
  console.log(`Job added: ${job.id}`);
}

trigger().catch(console.error);
