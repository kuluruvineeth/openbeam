import { registerHandler } from "../handler-registry";

registerHandler({
  connectorType: "mindtickle",
  execute(actionId) {
    return Promise.resolve({
      success: false,
      data: {},
      error: `Mindtickle actions are not available. The Mindtickle API requires JWT-signed authentication and uses services/data/v2.0/mtobjects/ path patterns. Action "${actionId}" requires a rewrite with correct auth and endpoints.`,
    });
  },
});
