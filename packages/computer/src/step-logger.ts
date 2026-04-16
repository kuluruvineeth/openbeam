import type { StepRecord } from "@openbeam/types/computer";

export function createStepLogger(steps: StepRecord[]) {
  return {
    log(type: string, name: string, input: unknown) {
      const start = Date.now();
      return {
        done(output: unknown) {
          steps.push({
            type,
            name,
            input,
            output,
            durationMs: Date.now() - start,
          });
        },
      };
    },
  };
}
