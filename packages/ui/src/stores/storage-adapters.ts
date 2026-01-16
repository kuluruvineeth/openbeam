"use client";

type StorageValue = Record<string, unknown>;

type StorageAdapter = {
  getItem: (name: string) => StorageValue | null | Promise<StorageValue | null>;
  setItem: (name: string, value: StorageValue) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
};

type StorageAdapterSync = {
  getItem: (name: string) => StorageValue | null;
  setItem: (name: string, value: StorageValue) => void;
  removeItem: (name: string) => void;
};

type StorageAdapterAsync = {
  getItem: (name: string) => Promise<StorageValue | null>;
  setItem: (name: string, value: StorageValue) => Promise<void>;
  removeItem: (name: string) => Promise<void>;
};

function createLocalStorageAdapter(): StorageAdapterSync {
  return {
    getItem: (name) => {
      if (typeof window === "undefined") {
        return null;
      }
      const item = localStorage.getItem(name);
      if (!item) {
        return null;
      }
      try {
        return JSON.parse(item) as StorageValue;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      if (typeof window === "undefined") {
        return;
      }
      localStorage.setItem(name, JSON.stringify(value));
    },
    removeItem: (name) => {
      if (typeof window === "undefined") {
        return;
      }
      localStorage.removeItem(name);
    },
  };
}

function createNoopStorageAdapter(): StorageAdapterSync {
  return {
    getItem: () => null,
    setItem: () => {
      return;
    },
    removeItem: () => {
      return;
    },
  };
}

function createMemoryStorageAdapter(): StorageAdapterSync {
  const store = new Map<string, StorageValue>();
  return {
    getItem: (name) => store.get(name) ?? null,
    setItem: (name, value) => {
      store.set(name, value);
    },
    removeItem: (name) => {
      store.delete(name);
    },
  };
}

type ApiStorageConfig = {
  baseUrl?: string;
  fetch?: typeof fetch;
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
};

function createApiStorageAdapter(
  config: ApiStorageConfig = {}
): StorageAdapterAsync {
  const fetchFn = config.fetch ?? fetch;
  const baseUrl = config.baseUrl ?? "/api/preferences";
  const getHeaders = config.getHeaders ?? (() => ({}));

  return {
    getItem: async (name) => {
      try {
        const headers = await getHeaders();
        const response = await fetchFn(
          `${baseUrl}/${encodeURIComponent(name)}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json", ...headers },
          }
        );
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as StorageValue;
      } catch {
        return null;
      }
    },
    setItem: async (name, value) => {
      try {
        const headers = await getHeaders();
        await fetchFn(`${baseUrl}/${encodeURIComponent(name)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(value),
        });
      } catch {
        // Silent fail - could add error callback
      }
    },
    removeItem: async (name) => {
      try {
        const headers = await getHeaders();
        await fetchFn(`${baseUrl}/${encodeURIComponent(name)}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", ...headers },
        });
      } catch {
        // Silent fail
      }
    },
  };
}

type HybridStorageConfig = {
  primary: StorageAdapter;
  fallback: StorageAdapter;
};

function createHybridStorageAdapter(
  config: HybridStorageConfig
): StorageAdapter {
  return {
    getItem: async (name) => {
      const primary = await config.primary.getItem(name);
      if (primary !== null) {
        return primary;
      }
      return config.fallback.getItem(name);
    },
    setItem: async (name, value) => {
      await Promise.all([
        config.primary.setItem(name, value),
        config.fallback.setItem(name, value),
      ]);
    },
    removeItem: async (name) => {
      await Promise.all([
        config.primary.removeItem(name),
        config.fallback.removeItem(name),
      ]);
    },
  };
}

export type {
  StorageAdapter,
  StorageAdapterSync,
  StorageAdapterAsync,
  StorageValue,
  ApiStorageConfig,
  HybridStorageConfig,
};

export {
  createLocalStorageAdapter,
  createNoopStorageAdapter,
  createMemoryStorageAdapter,
  createApiStorageAdapter,
  createHybridStorageAdapter,
};
