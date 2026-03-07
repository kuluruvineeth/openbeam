import type { AdapterModel, ServerAdapterModule } from "./types";

const adaptersByType = new Map<string, ServerAdapterModule>();

export function registerAdapter(adapter: ServerAdapterModule) {
  adaptersByType.set(adapter.type, adapter);
}

export function getAdapter(type: string): ServerAdapterModule | null {
  return adaptersByType.get(type) ?? null;
}

export function getAdapterOrThrow(type: string): ServerAdapterModule {
  const adapter = adaptersByType.get(type);
  if (!adapter) {
    throw new Error(`Unknown adapter type: ${type}`);
  }
  return adapter;
}

export function listAdapterTypes(): string[] {
  return [...adaptersByType.keys()];
}

export function listAdapterModels(
  type: string
): AdapterModel[] | Promise<AdapterModel[]> {
  const adapter = adaptersByType.get(type);
  if (!adapter) {
    return [];
  }
  if (adapter.listModels) {
    return adapter.listModels();
  }
  return adapter.models ?? [];
}

export function getAdapterConfigurationDoc(type: string): string | null {
  const adapter = adaptersByType.get(type);
  return adapter?.agentConfigurationDoc ?? null;
}
