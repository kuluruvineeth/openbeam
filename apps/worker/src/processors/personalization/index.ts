import type { ProfileUpdateJobData } from "@openplane/redis";
import type { ProcessorResult } from "../types";
import { createWorker } from "../worker-factory";
import { processProfileUpdate } from "./handler";

export function createProfileUpdateProcessor(): ProcessorResult {
  return createWorker<ProfileUpdateJobData, { success: boolean }>({
    queueName: "profile-update",
    handler: processProfileUpdate,
    concurrency: 10,
    workerOptions: {
      lockDuration: 30_000,
    },
  });
}

export { processProfileUpdate } from "./handler";
