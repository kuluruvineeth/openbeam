import {
  LinearConnectionSchema,
  type LinearDocument,
  LinearDocumentSchema,
  type LinearPageInfo,
} from "@openplane/types/services/connectors/linear";
import type { LinearClient } from "../client";

const DOCUMENT_FRAGMENT = `
  fragment DocumentFields on Document {
    id
    title
    content
    icon
    color
    createdAt
    updatedAt
    archivedAt
    url
    creator {
      id
      name
      email
      avatarUrl
      displayName
      active
    }
    project {
      id
      name
    }
  }
`;

const DOCUMENTS_QUERY = `
  ${DOCUMENT_FRAGMENT}
  query Documents($first: Int!, $after: String, $filter: DocumentFilter) {
    documents(first: $first, after: $after, filter: $filter, orderBy: updatedAt) {
      nodes {
        ...DocumentFields
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

const DOCUMENT_QUERY = `
  ${DOCUMENT_FRAGMENT}
  query Document($id: String!) {
    document(id: $id) {
      ...DocumentFields
    }
  }
`;

interface DocumentsResponse {
  documents: {
    nodes: LinearDocument[];
    pageInfo: LinearPageInfo;
  };
}

interface DocumentResponse {
  document: LinearDocument;
}

export interface GetDocumentsOptions {
  cursor?: string;
  filter?: {
    updatedAt?: { gte: string };
  };
}

export async function getDocuments(
  client: LinearClient,
  options: GetDocumentsOptions = {}
): Promise<{ documents: LinearDocument[]; nextCursor?: string }> {
  const { cursor, filter } = options;

  const data = await client.query<DocumentsResponse>(DOCUMENTS_QUERY, {
    first: 50,
    after: cursor,
    filter,
  });

  const connection = LinearConnectionSchema(LinearDocumentSchema).parse(
    data.documents
  );

  return {
    documents: connection.nodes,
    nextCursor: connection.pageInfo.hasNextPage
      ? (connection.pageInfo.endCursor ?? undefined)
      : undefined,
  };
}

export async function* getAllDocuments(
  client: LinearClient,
  filter?: { updatedAt?: { gte: string } }
): AsyncGenerator<LinearDocument, void, undefined> {
  let cursor: string | undefined;

  do {
    const { documents, nextCursor } = await getDocuments(client, {
      cursor,
      filter,
    });
    for (const document of documents) {
      yield document;
    }
    cursor = nextCursor;
  } while (cursor);
}

export async function getDocument(
  client: LinearClient,
  documentId: string
): Promise<LinearDocument> {
  const data = await client.query<DocumentResponse>(DOCUMENT_QUERY, {
    id: documentId,
  });
  return LinearDocumentSchema.parse(data.document);
}
