import { registerHandler } from "../handler-registry";

registerHandler({
  connectorType: "haystack",
  execute(_actionId) {
    return Promise.resolve({
      success: false,
      data: {},
      error:
        "Haystack people updates are not available. Haystack (haystackteam.com) does not expose a public developer API for reading or writing people/directory data.",
    });
  },
});
