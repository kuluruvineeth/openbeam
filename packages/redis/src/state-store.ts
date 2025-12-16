import { cache } from "./cache";

const STATE_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface StateStore {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T) => Promise<void>;
}

export function createStateStore(): StateStore {
  return {
    get: async <T>(key: string): Promise<T | null> => cache.get<T>(key),
    set: async <T>(key: string, value: T): Promise<void> => {
      await cache.set(key, value, STATE_TTL_SECONDS);
    },
  };
}
