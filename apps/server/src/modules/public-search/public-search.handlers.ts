import type { RouteHandler } from "@hono/zod-openapi";
import {
  publicGetDocument,
  publicSearch,
  publicStreamOverview,
} from "@openbeam/services";
import {
  DATASET_REGISTRY,
  getDatasetsByCategory,
} from "@openbeam/types/public";
import { streamSSE } from "hono/streaming";
import type { AuthEnv } from "@/middleware/auth";
import type {
  publicDatasetsRoute,
  publicDocumentRoute,
  publicOverviewRoute,
  publicSearchRoute,
} from "./public-search.routes";

const SNIPPET_BREAK_THRESHOLD = 0.7;

function extractSnippet(content: string, maxLength = 200): string {
  if (content.length <= maxLength) {
    return content;
  }
  const truncated = content.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > maxLength * SNIPPET_BREAK_THRESHOLD
    ? `${truncated.slice(0, lastSpace)}\u2026`
    : `${truncated}\u2026`;
}

function connectorTypeToCategory(connectorType: string): string {
  const entry =
    DATASET_REGISTRY[connectorType as keyof typeof DATASET_REGISTRY];
  return entry?.category ?? "security";
}

export const publicSearchHandler: RouteHandler<
  typeof publicSearchRoute,
  AuthEnv
> = async (c) => {
  const startMs = Date.now();
  const params = c.req.valid("query");

  const connectorTypes: string[] = [];
  if (params.dataset?.length) {
    connectorTypes.push(...params.dataset);
  }
  if (params.category) {
    const categoryDatasets = getDatasetsByCategory(params.category);
    connectorTypes.push(...categoryDatasets.map((d) => d.appType));
  }

  const result = await publicSearch({
    query: params.q,
    connectorTypes: connectorTypes.length > 0 ? connectorTypes : undefined,
    documentTypes: params.document_type,
    fromDate: params.from_date,
    toDate: params.to_date,
    limit: params.limit,
    offset: params.offset,
  });

  const datasetCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  const hits = result.documents.map((doc) => {
    const dataset = doc.connectorType ?? "unknown";
    const category = connectorTypeToCategory(dataset);

    datasetCounts.set(dataset, (datasetCounts.get(dataset) ?? 0) + 1);
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);

    return {
      id: doc.id,
      title: doc.title,
      snippet: extractSnippet(doc.content),
      url: doc.url,
      dataset,
      category,
      createdAt: doc.createdAt ?? 0,
      updatedAt: doc.updatedAt ?? 0,
      relevance: doc.relevance,
      documentType: doc.documentType ?? "unknown",
    };
  });

  const totalMs = Date.now() - startMs;

  return c.json(
    {
      hits,
      total: result.total,
      limit: params.limit,
      offset: params.offset,
      query: params.q,
      facets: {
        datasets: [...datasetCounts.entries()].map(([dataset, count]) => ({
          dataset,
          count,
        })),
        categories: [...categoryCounts.entries()].map(([category, count]) => ({
          category,
          count,
        })),
      },
      timing: {
        searchMs: result.timing,
        totalMs,
      },
    },
    200
  );
};

export const publicOverviewHandler: RouteHandler<
  typeof publicOverviewRoute,
  AuthEnv
> = (c) => {
  const { q } = c.req.valid("query");

  return streamSSE(c, async (sseStream) => {
    try {
      for await (const chunk of publicStreamOverview(q)) {
        await sseStream.writeSSE({
          data: JSON.stringify(chunk),
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Stream failed";
      await sseStream.writeSSE({
        data: JSON.stringify({ type: "error", error: message }),
      });
    }
  });
};

export const publicDocumentHandler: RouteHandler<
  typeof publicDocumentRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  const doc = await publicGetDocument(id);
  if (!doc) {
    return c.json({ error: "Document not found" }, 404);
  }

  const category = connectorTypeToCategory(doc.connectorType ?? "unknown");

  return c.json(
    {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      url: doc.url,
      dataset: doc.connectorType ?? "unknown",
      category,
      documentType: doc.documentType ?? "unknown",
      createdAt: doc.createdAt ?? 0,
      updatedAt: doc.updatedAt ?? 0,
    },
    200
  );
};

export const publicDatasetsHandler: RouteHandler<
  typeof publicDatasetsRoute,
  AuthEnv
> = (c) => {
  const datasets = Object.values(DATASET_REGISTRY).map((entry) => ({
    id: entry.appType,
    name: entry.name,
    description: entry.description,
    category: entry.category,
    estimatedDocuments: entry.estimatedDocuments,
  }));

  return c.json({ datasets }, 200);
};
