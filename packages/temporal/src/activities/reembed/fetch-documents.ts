import type { GenericDocument } from "@openplane/vespa";
import { escapeYqlString, vespaClient } from "@openplane/vespa";
import type {
  DocumentToReembed,
  FetchDocumentsForReembedInput,
  FetchDocumentsForReembedOutput,
} from "./types";

export async function fetchDocumentsForReembed(
  input: FetchDocumentsForReembedInput
): Promise<FetchDocumentsForReembedOutput> {
  let yql: string;

  if (input.teamId) {
    const escapedTeamId = escapeYqlString(input.teamId);
    yql = `select id, content, title from openplane_document where team_id contains "${escapedTeamId}" and !(embedding_version = 2)`;
  } else {
    yql =
      "select id, content, title from openplane_document where !(embedding_version = 2)";
  }

  const result = await vespaClient.query<GenericDocument>({
    yql,
    hits: input.limit,
    timeout: "60s",
  });

  const documents: DocumentToReembed[] =
    result.root.children?.map((c) => ({
      id: c.fields.id,
      content: c.fields.content ?? "",
      title: c.fields.title,
    })) ?? [];

  const validDocs: DocumentToReembed[] = [];
  const emptyDocs: DocumentToReembed[] = [];

  for (const doc of documents) {
    if (doc.content.trim()) {
      validDocs.push(doc);
    } else {
      emptyDocs.push(doc);
    }
  }

  return {
    documents,
    validDocs,
    emptyDocs,
  };
}
