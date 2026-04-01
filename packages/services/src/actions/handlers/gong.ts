import { registerHandler } from "../handler-registry";

registerHandler({
  connectorType: "gong",
  execute(actionId) {
    return Promise.resolve({
      success: false,
      data: {},
      error: `Unsupported Gong action: ${actionId}`,
    });
  },
});
