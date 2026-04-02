import { registerHandler } from "../handler-registry";

registerHandler({
  connectorType: "interact",
  execute(_actionId) {
    return Promise.resolve({
      success: false,
      data: {},
      error:
        "Interact page operations require the /page/composer endpoint with additional required fields (ContentType, TopSectionIds, CategoryIds, etc.). Current implementation uses incorrect paths.",
    });
  },
});
