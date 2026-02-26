import { createRequire } from "node:module";

export type SherpaOnnxModule = {
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  createOnlineRecognizer: (config: any) => any;
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  createOfflineRecognizer: (config: any) => any;
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  createOfflineTts: (config: any) => any;
};

let cached: SherpaOnnxModule | null = null;

export function loadSherpaOnnx(): SherpaOnnxModule {
  if (cached) {
    return cached;
  }

  const require = createRequire(import.meta.url);
  cached = require("sherpa-onnx") as SherpaOnnxModule;
  return cached;
}
