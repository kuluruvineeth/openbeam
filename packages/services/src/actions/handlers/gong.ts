import { registerHandler } from "../handler-registry";

registerHandler({
  connectorType: "gong",
  execute(actionId) {
    return Promise.resolve({
      success: false,
      data: {},
      error: `Gong is a read-only connector. Action "${actionId}" is not supported.`,
    });
  },
});
