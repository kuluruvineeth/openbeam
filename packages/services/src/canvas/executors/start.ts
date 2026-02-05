import type { CanvasNodeExecutor } from "../types";

export const startExecutor: CanvasNodeExecutor = ({ input, context }) => {
  if (input === undefined) {
    return context?.input;
  }
  return input;
};
