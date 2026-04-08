import type { BotPlatform, PlatformAdapter } from "@openbeam/types/bot";

const adapters = new Map<BotPlatform, PlatformAdapter>();

export function registerAdapter(adapter: PlatformAdapter): void {
  adapters.set(adapter.platform, adapter);
}

export function getAdapter(platform: BotPlatform): PlatformAdapter | undefined {
  return adapters.get(platform);
}

export function getAllAdapters(): PlatformAdapter[] {
  return [...adapters.values()];
}
