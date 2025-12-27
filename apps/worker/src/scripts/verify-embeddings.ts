import { vespaClient } from "@openplane/vespa";

async function verify() {
  const embedded = await vespaClient.query({
    yql: "select id from openplane_document where embedding_version = 2",
    hits: 0,
    timeout: "30s",
  });

  const notEmbedded = await vespaClient.query({
    yql: "select id from openplane_document where !(embedding_version = 2)",
    hits: 0,
    timeout: "30s",
  });

  const sample = await vespaClient.query({
    yql: "select id, title, embedding_version from openplane_document where embedding_version = 2",
    hits: 1,
    timeout: "30s",
  });

  console.log("\n=== Embedding Verification ===\n");
  console.log(
    `Documents with embeddings (v2): ${embedded.root.fields?.totalCount ?? 0}`
  );
  console.log(
    `Documents without embeddings:   ${notEmbedded.root.fields?.totalCount ?? 0}`
  );

  const sampleDoc = sample.root.children?.[0];
  if (sampleDoc) {
    console.log("\nSample document:");
    console.log(JSON.stringify(sampleDoc.fields, null, 2));
  }
}

verify().catch(console.error);
