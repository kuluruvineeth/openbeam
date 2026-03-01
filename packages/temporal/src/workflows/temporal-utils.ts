import { workflowInfo } from "@temporalio/workflow";

export function currentTimestamp(): number {
  const unsafe = workflowInfo().unsafe;
  if (typeof unsafe?.now === "function") {
    return unsafe.now();
  }
  return Date.now();
}
