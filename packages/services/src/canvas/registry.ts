import type { CanvasNodeType } from "@openbeam/types/canvas";
import type { CanvasNodeExecutor } from "./types";

const executors = new Map<CanvasNodeType, CanvasNodeExecutor>();
let frozen = false;

export function registerCanvasNodeExecutor(
  nodeType: CanvasNodeType,
  executor: CanvasNodeExecutor
): void {
  if (frozen) {
    throw new Error("Cannot register executors after registry has been frozen");
  }
  executors.set(nodeType, executor);
}

export function getCanvasNodeExecutor(
  nodeType: CanvasNodeType
): CanvasNodeExecutor | undefined {
  return executors.get(nodeType);
}

export function listCanvasNodeExecutors(): CanvasNodeType[] {
  return Array.from(executors.keys());
}

export function freezeRegistry(): void {
  frozen = true;
}
