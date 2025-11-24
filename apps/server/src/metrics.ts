import prisma from "@openplane/db";
import client from "prom-client";
import logger from "./utils/logger";

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

export const searchQueriesCounter = new client.Counter({
  name: "search_queries_total",
  help: "Total number of search queries processed",
  labelNames: ["endpoint"],
  registers: [register],
});

const documentsIndexedGauge = new client.Gauge({
  name: "documents_indexed_total",
  help: "Total number of documents indexed in Vespa",
  registers: [register],
});

const refreshDocumentsIndexedGauge = async () => {
  const count = await prisma.indexedDocument.count();
  documentsIndexedGauge.set(count);
};

refreshDocumentsIndexedGauge().catch((error) => {
  logger.error({ error }, "Failed to refresh documents_indexed_total");
});
const gaugeRefreshInterval =
  Number(process.env.DOCUMENTS_GAUGE_REFRESH_MS || "60000") || 60_000;
const gaugeTimer = setInterval(() => {
  refreshDocumentsIndexedGauge().catch((error) => {
    logger.error({ error }, "Failed to refresh documents_indexed_total");
  });
}, gaugeRefreshInterval);

if (gaugeTimer.unref) {
  gaugeTimer.unref();
}

export { register };
