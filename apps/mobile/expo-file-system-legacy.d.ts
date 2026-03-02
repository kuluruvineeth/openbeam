declare module "expo-file-system/legacy" {
  export const EncodingType: {
    Base64: "base64";
    UTF8: "utf8";
  };

  export type ReadingOptions = {
    encoding?:
      | keyof typeof EncodingType
      | (typeof EncodingType)[keyof typeof EncodingType];
  };

  export type WritingOptions = {
    encoding?:
      | keyof typeof EncodingType
      | (typeof EncodingType)[keyof typeof EncodingType];
  };

  export type DownloadProgressData = {
    totalBytesWritten: number;
    totalBytesExpectedToWrite: number;
  };

  export type DownloadResult = {
    uri: string;
  };

  export type DownloadResumable = {
    downloadAsync(): Promise<DownloadResult | null>;
  };

  export function createDownloadResumable(
    url: string,
    fileUri: string,
    options?:
      | {
          headers?: Record<string, string>;
        }
      | undefined,
    callback?: ((data: DownloadProgressData) => void) | undefined
  ): DownloadResumable;

  export function readAsStringAsync(
    uri: string,
    options?: ReadingOptions
  ): Promise<string>;

  export function writeAsStringAsync(
    uri: string,
    contents: string,
    options?: WritingOptions
  ): Promise<void>;

  export function deleteAsync(
    uri: string,
    options?: { idempotent?: boolean }
  ): Promise<void>;

  export const cacheDirectory: string;
  export const documentDirectory: string;
}
