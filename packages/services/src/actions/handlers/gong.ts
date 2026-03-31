import { registerHandler } from "../handler-registry";

registerHandler({
  connectorType: "gong",
  execute(actionId) {
    return {
      success: false,
      data: {},
      error: `Unsupported Gong action: ${actionId}`,
    };
  },
});
