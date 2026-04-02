import { registerHandler } from "../handler-registry";

registerHandler({
  connectorType: "fellow",
  execute(_actionId) {
    return Promise.resolve({
      success: false,
      data: {},
      error:
        "Fellow actions require API v1 at {subdomain}.fellow.app with X-API-KEY auth. Current implementation uses wrong base URL, auth header, and endpoint paths. Action items only support complete/archive (not create/update) via the Fellow API.",
    });
  },
});
