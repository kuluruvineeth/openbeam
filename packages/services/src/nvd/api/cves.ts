import {
  NVD_MAX_RESULTS_PER_PAGE,
  type NvdApiResponse,
  NvdApiResponseSchema,
  type NvdCve,
} from "@openbeam/types/services/connectors/nvd";
import type { NvdClient } from "../client";
import { NvdApiError } from "../types";

interface GetCvesOptions {
  startIndex?: number;
  resultsPerPage?: number;
  lastModStartDate?: string;
  lastModEndDate?: string;
}

export async function getCves(
  client: NvdClient,
  options: GetCvesOptions = {}
): Promise<NvdApiResponse> {
  const {
    startIndex = 0,
    resultsPerPage = NVD_MAX_RESULTS_PER_PAGE,
    lastModStartDate,
    lastModEndDate,
  } = options;

  const params: Record<string, string> = {
    startIndex: String(startIndex),
    resultsPerPage: String(resultsPerPage),
  };

  if (lastModStartDate) {
    params.lastModStartDate = lastModStartDate;
  }
  if (lastModEndDate) {
    params.lastModEndDate = lastModEndDate;
  }

  const raw = await client.get<unknown>(params);
  const result = NvdApiResponseSchema.safeParse(raw);

  if (!result.success) {
    throw new NvdApiError({
      message: `Invalid NVD API response: ${result.error.message}`,
      code: "INVALID_RESPONSE",
      retryable: false,
    });
  }

  return result.data;
}

export async function* getAllCves(
  client: NvdClient,
  options: GetCvesOptions = {}
): AsyncGenerator<{
  cves: NvdCve[];
  startIndex: number;
  totalResults: number;
}> {
  const resultsPerPage = options.resultsPerPage ?? NVD_MAX_RESULTS_PER_PAGE;
  let startIndex = options.startIndex ?? 0;
  let totalResults = 0;

  do {
    const response = await getCves(client, {
      ...options,
      startIndex,
      resultsPerPage,
    });

    totalResults = response.totalResults;
    const cves = response.vulnerabilities.map((v) => v.cve);

    yield { cves, startIndex, totalResults };

    startIndex += response.resultsPerPage;
  } while (startIndex < totalResults);
}

export function getModifiedCves(
  client: NvdClient,
  since: string,
  until: string
): Promise<NvdApiResponse> {
  return getCves(client, {
    lastModStartDate: since,
    lastModEndDate: until,
  });
}
