import { vi } from "vitest";

export function createMockExecutionDataStore() {
  const store = new Map<
    string,
    { payload: unknown; sizeBytes?: number; contentType?: string }
  >();
  let counter = 0;

  return {
    store,
    createData: vi.fn(
      (
        _db: unknown,
        _teamId: string,
        data: {
          payload: unknown;
          sizeBytes?: number;
          contentType?: string;
        }
      ) => {
        counter += 1;
        const id = `data-${counter}`;
        store.set(id, data);
        return Promise.resolve({ id, ...data });
      }
    ),
    findData: vi.fn((_db: unknown, _executionId: string, dataId: string) => {
      const record = store.get(dataId);
      return Promise.resolve(record ? { id: dataId, ...record } : null);
    }),
    reset: () => {
      store.clear();
      counter = 0;
    },
  };
}

export function createMockStepStore() {
  let counter = 0;

  return {
    createStep: vi.fn(() => {
      counter += 1;
      return Promise.resolve({ id: `step-${counter}` });
    }),
    updateStep: vi.fn(() => Promise.resolve(null)),
    reset: () => {
      counter = 0;
    },
  };
}

export function createMockDbActivities() {
  const dataStore = createMockExecutionDataStore();
  const stepStore = createMockStepStore();

  return {
    createAgentCanvasExecutionData: dataStore.createData,
    findAgentCanvasExecutionData: dataStore.findData,
    createAgentCanvasExecutionStep: stepStore.createStep,
    updateAgentCanvasExecutionStep: stepStore.updateStep,
    _stores: { dataStore, stepStore },
    reset: () => {
      dataStore.reset();
      stepStore.reset();
    },
  };
}
