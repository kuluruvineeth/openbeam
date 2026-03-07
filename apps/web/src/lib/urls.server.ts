import { env } from "@/env";
import { publicServerUrl } from "./urls";

export const internalServerUrl = env.SERVER_INTERNAL_URL || publicServerUrl;

export const ssrTrpcUrl = `${internalServerUrl}/trpc`;
