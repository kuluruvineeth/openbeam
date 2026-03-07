import type { GenericDocument } from "@openbeam/vespa";
import { escapeYqlString, vespaClient } from "@openbeam/vespa";
import type {
  CountDocumentsNeedingEmbeddingInput,
  CountDocumentsNeedingEmbeddingOutput,
} from "./types";

export async function countDocumentsNeedingEmbedding(
  input: CountDocumentsNeedingEmbeddingInput
): Promise<CountDocumentsNeedingEmbeddingOutput> {
  let yql: string;

  if (input.teamId) {
    const escapedTeamId = escapeYqlString(input.teamId);
    yql = `select id from openbeam_document where team_id contains "${escapedTeamId}" and !(embedding_version = 2)`;
  } else {
    yql = "select id from openbeam_document where !(embedding_version = 2)";
  }

  const result = await vespaClient.query<GenericDocument>({
    yql,
    hits: 0,
    timeout: "30s",
  });

  return {
    count: result.root.fields?.totalCount ?? 0,
  };
}
