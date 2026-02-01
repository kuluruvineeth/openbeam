import type {
  ConnectorRecord,
  DownloadFileInput,
  DownloadFileOutput,
} from "../types";

export type DownloadStrategy = (
  input: DownloadFileInput
) => Promise<DownloadFileOutput>;

export interface DownloadStrategyDependencies {
  tempDir?: string;
}

export interface DownloadContext {
  connector: ConnectorRecord;
  tempDir: string;
}
