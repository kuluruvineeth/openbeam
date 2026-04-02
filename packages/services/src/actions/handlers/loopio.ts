import { registerHandler } from "../handler-registry";

registerHandler({
  connectorType: "loopio",
  execute(_actionId) {
    return Promise.resolve({
      success: false,
      data: {},
      error:
        "Loopio actions require OAuth 2.0 auth and use JSON Patch semantics for updates. Current implementation uses incorrect auth and request format.",
    });
  },
});
