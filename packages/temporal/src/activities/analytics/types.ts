import type { AIUsageLogForExport } from "@openbeam/types/db";

export type { AIUsageLogForExport };

export interface CountLogsForExportInput {
  teamId: string;
  date: string;
}

export interface CountLogsForExportOutput {
  count: number;
}

export interface GetLogsForExportInput {
  teamId: string;
  date: string;
  limit?: number;
}

export interface GetLogsForExportOutput {
  logs: AIUsageLogForExport[];
}

export interface ExportToParquetInput {
  teamId: string;
  date: string;
  logs: AIUsageLogForExport[];
}

export interface ExportToParquetOutput {
  s3Key: string;
  recordCount: number;
}

export interface GetTeamsWithUsageInput {
  date: string;
}

export interface GetTeamsWithUsageOutput {
  teamIds: string[];
}

export interface AnalyticsExportActivities {
  countLogsForExport(
    input: CountLogsForExportInput
  ): Promise<CountLogsForExportOutput>;
  getLogsForExport(
    input: GetLogsForExportInput
  ): Promise<GetLogsForExportOutput>;
  exportToParquet(input: ExportToParquetInput): Promise<ExportToParquetOutput>;
  getTeamsWithUsage(
    input: GetTeamsWithUsageInput
  ): Promise<GetTeamsWithUsageOutput>;
}
