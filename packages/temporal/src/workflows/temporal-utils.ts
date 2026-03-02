import { condition, sleep, workflowInfo } from "@temporalio/workflow";

export function currentTimestamp(): number {
  const unsafe = workflowInfo().unsafe;
  if (typeof unsafe?.now === "function") {
    return unsafe.now();
  }
  return Date.now();
}

export async function conditionWithTimeout(
  fn: () => boolean,
  timeoutMs: number
): Promise<boolean> {
  if (fn()) {
    return true;
  }

  let timedOut = false;
  const timerPromise = sleep(timeoutMs).then(() => {
    timedOut = true;
  });
  const conditionPromise = condition(fn);

  await Promise.race([timerPromise, conditionPromise]);
  return !timedOut;
}
