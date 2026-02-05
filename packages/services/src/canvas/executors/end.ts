import type { CanvasNodeExecutor } from "../types";

export const endExecutor: CanvasNodeExecutor = ({ input, context }) => {
  if (input === undefined) {
    return context?.input;
  }
  return input;
};
