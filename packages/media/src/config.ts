import type { TwelveLabsConfig } from "./types";

let configInstance: TwelveLabsConfig | null = null;

function loadConfig(): TwelveLabsConfig {
  return {
    apiKey: process.env.TWELVELABS_API_KEY || "",
    baseUrl:
      process.env.TWELVELABS_BASE_URL || "https://api.twelvelabs.io/v1.3",
  };
}

export function getMediaConfig(): TwelveLabsConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

export function isMediaServiceConfigured(): boolean {
  const config = getMediaConfig();
  return !!config.apiKey;
}

export function resetMediaConfig(): void {
  configInstance = null;
}
