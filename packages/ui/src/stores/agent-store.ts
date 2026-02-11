"use client";

import { DEFAULT_CHAT_MODEL } from "@openplane/types/ai";
import { create, type StateCreator } from "zustand";
import {
  createJSONStorage,
  type PersistOptions,
  persist,
} from "zustand/middleware";
import {
  createLocalStorageAdapter,
  createNoopStorageAdapter,
  type StorageAdapter,
} from "./storage-adapters";

type CapabilityId =
  | "search"
  | "rag"
  | "documents"
  | "connectors"
  | "memory"
  | "web"
  | "code"
  | "data";

type Capability = {
  id: CapabilityId;
  name: string;
  description: string;
  isEnabled: boolean;
};

type AgentStoreState = {
  selectedModelId: string;
  capabilities: Record<CapabilityId, Capability>;
  isToolbarExpanded: boolean;
  enabledCapabilityIds: CapabilityId[];
  isHydrated: boolean;
};

type AgentStoreActions = {
  selectModel: (modelId: string) => void;
  toggleCapability: (capabilityId: CapabilityId) => void;
  enableCapability: (capabilityId: CapabilityId) => void;
  disableCapability: (capabilityId: CapabilityId) => void;
  setCapabilities: (capabilityIds: CapabilityId[]) => void;
  toggleToolbar: () => void;
  hydrate: (state: Partial<AgentStorePersisted>) => void;
  reset: () => void;
};

type AgentStore = AgentStoreState & AgentStoreActions;

type AgentStorePersisted = Pick<
  AgentStoreState,
  "selectedModelId" | "capabilities"
>;

const DEFAULT_CAPABILITIES: Record<CapabilityId, Capability> = {
  search: {
    id: "search",
    name: "Search",
    description: "Search across connected data sources",
    isEnabled: true,
  },
  rag: {
    id: "rag",
    name: "RAG",
    description: "Retrieval-augmented generation for grounded answers",
    isEnabled: true,
  },
  documents: {
    id: "documents",
    name: "Documents",
    description: "Read and analyze documents",
    isEnabled: true,
  },
  connectors: {
    id: "connectors",
    name: "Connectors",
    description: "Access connector sync and status",
    isEnabled: false,
  },
  memory: {
    id: "memory",
    name: "Memory",
    description: "Long-term memory and context retention",
    isEnabled: false,
  },
  web: {
    id: "web",
    name: "Web",
    description: "Browse and fetch web content",
    isEnabled: false,
  },
  code: {
    id: "code",
    name: "Code",
    description: "Execute code and analyze repositories",
    isEnabled: false,
  },
  data: {
    id: "data",
    name: "Data",
    description: "Transform and aggregate data",
    isEnabled: false,
  },
};

const DEFAULT_MODEL_ID = DEFAULT_CHAT_MODEL;

function computeEnabledCapabilities(
  capabilities: Record<CapabilityId, Capability>
): CapabilityId[] {
  return Object.values(capabilities)
    .filter((c) => c.isEnabled)
    .map((c) => c.id);
}

const createInitialState = (): AgentStoreState => ({
  selectedModelId: DEFAULT_MODEL_ID,
  capabilities: DEFAULT_CAPABILITIES,
  isToolbarExpanded: false,
  enabledCapabilityIds: computeEnabledCapabilities(DEFAULT_CAPABILITIES),
  isHydrated: false,
});

const createAgentStoreSlice: StateCreator<AgentStore> = (set) => ({
  ...createInitialState(),

  selectModel: (modelId) => {
    set({ selectedModelId: modelId });
  },

  toggleCapability: (capabilityId) => {
    set((state) => {
      const capability = state.capabilities[capabilityId];
      if (!capability) {
        return state;
      }

      const updated = {
        ...state.capabilities,
        [capabilityId]: { ...capability, isEnabled: !capability.isEnabled },
      };

      return {
        capabilities: updated,
        enabledCapabilityIds: computeEnabledCapabilities(updated),
      };
    });
  },

  enableCapability: (capabilityId) => {
    set((state) => {
      const capability = state.capabilities[capabilityId];
      if (!capability || capability.isEnabled) {
        return state;
      }

      const updated = {
        ...state.capabilities,
        [capabilityId]: { ...capability, isEnabled: true },
      };

      return {
        capabilities: updated,
        enabledCapabilityIds: computeEnabledCapabilities(updated),
      };
    });
  },

  disableCapability: (capabilityId) => {
    set((state) => {
      const capability = state.capabilities[capabilityId];
      if (!capability?.isEnabled) {
        return state;
      }

      const updated = {
        ...state.capabilities,
        [capabilityId]: { ...capability, isEnabled: false },
      };

      return {
        capabilities: updated,
        enabledCapabilityIds: computeEnabledCapabilities(updated),
      };
    });
  },

  setCapabilities: (capabilityIds) => {
    set((state) => {
      const updated = { ...state.capabilities };
      for (const id of Object.keys(updated) as CapabilityId[]) {
        updated[id] = {
          ...updated[id],
          isEnabled: capabilityIds.includes(id),
        };
      }

      return {
        capabilities: updated,
        enabledCapabilityIds: computeEnabledCapabilities(updated),
      };
    });
  },

  toggleToolbar: () => {
    set((state) => ({ isToolbarExpanded: !state.isToolbarExpanded }));
  },

  hydrate: (persisted) => {
    set((state) => {
      const capabilities = persisted.capabilities
        ? { ...state.capabilities, ...persisted.capabilities }
        : state.capabilities;

      return {
        selectedModelId: persisted.selectedModelId ?? state.selectedModelId,
        capabilities,
        enabledCapabilityIds: computeEnabledCapabilities(capabilities),
        isHydrated: true,
      };
    });
  },

  reset: () => {
    set({ ...createInitialState(), isHydrated: true });
  },
});

type AgentStoreConfig = {
  storage?: StorageAdapter | "localStorage" | "memory" | "none";
  storageKey?: string;
  onRehydrateStorage?: (state: AgentStore | undefined) => void;
};

function createZustandStorage(adapter: StorageAdapter) {
  return createJSONStorage<AgentStorePersisted>(() => ({
    getItem: (name) => {
      const result = adapter.getItem(name);
      if (result instanceof Promise) {
        return result.then((v) => (v ? JSON.stringify(v) : null));
      }
      return result ? JSON.stringify(result) : null;
    },
    setItem: (name, value) => {
      const parsed = JSON.parse(value) as AgentStorePersisted;
      adapter.setItem(name, parsed as Record<string, unknown>);
    },
    removeItem: (name) => {
      adapter.removeItem(name);
    },
  }));
}

function resolveStorageAdapter(
  storage: AgentStoreConfig["storage"]
): StorageAdapter {
  if (!storage || storage === "localStorage") {
    return createLocalStorageAdapter();
  }
  if (storage === "none") {
    return createNoopStorageAdapter();
  }
  if (storage === "memory") {
    const { createMemoryStorageAdapter } = require("./storage-adapters");
    return createMemoryStorageAdapter();
  }
  return storage;
}

function createAgentStore(config: AgentStoreConfig = {}) {
  const {
    storage = "localStorage",
    storageKey = "openplane-agent-store",
    onRehydrateStorage,
  } = config;

  const adapter = resolveStorageAdapter(storage);

  const persistOptions: PersistOptions<AgentStore, AgentStorePersisted> = {
    name: storageKey,
    storage: createZustandStorage(adapter),
    partialize: (state) => ({
      selectedModelId: state.selectedModelId,
      capabilities: state.capabilities,
    }),
    onRehydrateStorage: () => (state) => {
      if (state) {
        state.isHydrated = true;
      }
      onRehydrateStorage?.(state);
    },
  };

  return create<AgentStore>()(persist(createAgentStoreSlice, persistOptions));
}

const useAgentStore = createAgentStore();

const useSelectedModel = () => useAgentStore((state) => state.selectedModelId);

const useEnabledCapabilities = () =>
  useAgentStore((state) => state.enabledCapabilityIds);

const useCapability = (id: CapabilityId) =>
  useAgentStore((state) => state.capabilities[id]);

const useIsCapabilityEnabled = (id: CapabilityId) =>
  useAgentStore((state) => state.capabilities[id]?.isEnabled ?? false);

const useToolbarExpanded = () =>
  useAgentStore((state) => state.isToolbarExpanded);

const useIsHydrated = () => useAgentStore((state) => state.isHydrated);

export type {
  AgentStore,
  AgentStoreState,
  AgentStoreActions,
  AgentStoreConfig,
  AgentStorePersisted,
  Capability,
  CapabilityId,
};

export {
  createAgentStore,
  createInitialState,
  DEFAULT_CAPABILITIES,
  DEFAULT_MODEL_ID,
  useAgentStore,
  useCapability,
  useEnabledCapabilities,
  useIsCapabilityEnabled,
  useIsHydrated,
  useSelectedModel,
  useToolbarExpanded,
};
