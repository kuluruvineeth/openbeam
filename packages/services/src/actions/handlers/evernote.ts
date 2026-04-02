import { registerHandler } from "../handler-registry";

registerHandler({
  connectorType: "evernote",
  execute(actionId) {
    return Promise.resolve({
      success: false,
      data: {},
      error: `Evernote actions are not available. Evernote uses a Thrift-based API that requires the evernote SDK. Action "${actionId}" cannot be executed via REST.`,
    });
  },
});
