import { registerHandler } from "../handler-registry";

registerHandler({
  connectorType: "lumapps",
  execute(actionId) {
    return Promise.resolve({
      success: false,
      data: {},
      error: `LumApps actions are not available. The LumApps API uses Google App Engine endpoints (/_ah/api/lumsites/v1/) with non-standard patterns. Action "${actionId}" requires a rewrite to use the correct API format.`,
    });
  },
});
