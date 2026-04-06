import { deleteObject } from "../../s3/actions";
import { createS3Client } from "../../s3/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

registerHandler({
  connectorType: "s3",
  supportedActions: ["delete_object"],
  execute(actionId, params, credentials, connectorId) {
    if (actionId !== "delete_object") {
      return Promise.resolve({
        success: false,
        data: {},
        error: `Unsupported S3 action: ${actionId}`,
      });
    }

    const config = credentials.config;
    const client = createS3Client({
      connectorId,
      accessKeyId:
        credentials.accessToken ||
        (typeof config.accessKeyId === "string" ? config.accessKeyId : ""),
      secretAccessKey:
        typeof config.secretAccessKey === "string"
          ? config.secretAccessKey
          : "",
      region: (typeof config.region === "string"
        ? config.region
        : "us-east-1") as Parameters<typeof createS3Client>[0]["region"],
      bucketName:
        typeof config.bucketName === "string" ? config.bucketName : "",
    });

    const key = str(params, "key");
    const result = deleteObject(client, key);

    if (!result.success) {
      return Promise.resolve({ success: false, data: {}, error: result.error });
    }
    return Promise.resolve({
      success: true,
      data: { key: result.key },
    } as ActionExecutionResult);
  },
});
