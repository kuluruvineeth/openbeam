import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  requestId: string;
  method?: string;
  path?: string;
  route?: string;
  teamId?: string;
  userId?: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(
  requestContext: RequestContext,
  fn: () => T
): T {
  return requestContextStorage.run(requestContext, fn);
}

export function runWithRequestContextAsync<T>(
  requestContext: RequestContext,
  fn: () => Promise<T>
): Promise<T> {
  return requestContextStorage.run(requestContext, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export function updateRequestContext(
  requestContextUpdate: Partial<RequestContext>
): void {
  const requestContext = requestContextStorage.getStore();

  if (!requestContext) {
    return;
  }

  Object.assign(requestContext, requestContextUpdate);
}

export function setRequestContextValue<K extends keyof RequestContext>(
  key: K,
  value: RequestContext[K]
): void {
  const requestContext = requestContextStorage.getStore();

  if (!requestContext) {
    return;
  }

  requestContext[key] = value;
}
