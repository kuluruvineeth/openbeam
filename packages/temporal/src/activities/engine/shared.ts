export interface EngineActivityDependencies {
  cpuServiceUrl?: string;
  gpuServiceUrl?: string;
}

export const DEFAULT_CPU_URL =
  process.env.ENGINE_CPU_URL ??
  process.env.ENGINE_URL ??
  "http://localhost:8000";
export const DEFAULT_GPU_URL =
  process.env.ENGINE_GPU_URL ?? "http://localhost:8001";

export async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit,
  timeoutMs = 120_000
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Engine request failed: ${response.status} - ${errorText}`
      );
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
