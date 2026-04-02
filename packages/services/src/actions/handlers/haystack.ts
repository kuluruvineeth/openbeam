import { registerHandler } from "../handler-registry";

registerHandler({
  connectorType: "haystack",
  execute(_actionId) {
    return Promise.resolve({
      success: false,
      data: {},
      error:
        "Haystack people updates are not available. The Haystack API at api.usehaystack.io has no documented people write endpoints.",
    });
  },
});
