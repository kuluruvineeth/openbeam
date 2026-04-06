import type { ActionExecutionResult, DispatchRequest } from "./types";

export type DispatchNext = () => Promise<ActionExecutionResult>;

export type DispatchMiddleware = (
  request: DispatchRequest,
  next: DispatchNext
) => Promise<ActionExecutionResult>;

const middlewares: DispatchMiddleware[] = [];

export function registerDispatchMiddleware(
  middleware: DispatchMiddleware
): void {
  middlewares.push(middleware);
}

export function clearDispatchMiddlewares(): void {
  middlewares.length = 0;
}

export function getDispatchMiddlewares(): readonly DispatchMiddleware[] {
  return middlewares;
}

export function composeDispatchMiddlewares(
  request: DispatchRequest,
  terminal: DispatchNext
): DispatchNext {
  let next = terminal;
  for (let i = middlewares.length - 1; i >= 0; i -= 1) {
    const middleware = middlewares[i];
    if (!middleware) {
      continue;
    }
    const downstream = next;
    next = () => middleware(request, downstream);
  }
  return next;
}
