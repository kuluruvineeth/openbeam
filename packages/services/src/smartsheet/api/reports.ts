import type { SmartsheetClient } from "../client";

export interface SmartsheetReport {
  id: number;
  name: string;
  accessLevel: string;
  permalink: string;
  createdAt: string;
  modifiedAt: string;
  owner?: string;
  ownerId?: number;
  totalRowCount?: number;
  sourceSheets?: { id: number; name: string }[];
}

interface ReportListResponse {
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  data: SmartsheetReport[];
}

export async function* listReports(
  client: SmartsheetClient,
  options: { modifiedSince?: string; pageSize?: number } = {}
): AsyncGenerator<SmartsheetReport[], void, undefined> {
  const { modifiedSince, pageSize = 100 } = options;
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      pageSize: String(pageSize),
    };
    if (modifiedSince) {
      params.modifiedSince = modifiedSince;
    }

    const response = await client.get<ReportListResponse>("/reports", params);
    const reports = response.data ?? [];

    if (reports.length > 0) {
      yield reports;
    }

    if (page >= response.totalPages || reports.length < pageSize) {
      break;
    }

    page += 1;
  }
}
