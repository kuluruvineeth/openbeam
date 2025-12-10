import type { TwelveLabsConfig } from "./types";

let configInstance: TwelveLabsConfig | null = null;

function loadConfig(): TwelveLabsConfig {
  return {
    apiKey: process.env.TWELVELABS_API_KEY || "",
    baseUrl:
      process.env.TWELVELABS_BASE_URL || "https://api.twelvelabs.io/v1.3",
  };
}

export function getVideoConfig(): TwelveLabsConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

export function isVideoServiceConfigured(): boolean {
  const config = getVideoConfig();
  return !!config.apiKey;
}

export function resetVideoConfig(): void {
  configInstance = null;
}
