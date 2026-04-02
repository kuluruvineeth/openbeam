import { registerHandler } from "../handler-registry";

registerHandler({
  connectorType: "simpplr",
  execute(_actionId) {
    return Promise.resolve({
      success: false,
      data: {},
      error:
        "Simpplr actions require OAuth 2.0 at api.ec.simpplr.com with x-user-email header. Current implementation uses incorrect base URL, auth, and content type.",
    });
  },
});
