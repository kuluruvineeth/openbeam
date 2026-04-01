import { registerHandler } from "../handler-registry";

registerHandler({
  connectorType: "s3",
  execute(actionId) {
    return Promise.resolve({
      success: false,
      data: {},
      error: `Unsupported S3 action: ${actionId}`,
    });
  },
});
