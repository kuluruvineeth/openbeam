import { deleteObject } from "../../s3/actions";
import { registerHandler } from "../handler-registry";

registerHandler({
  connectorType: "s3",
  execute(actionId) {
    if (actionId === "object_delete") {
      const r = deleteObject(null as never, "");
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: false,
      data: {},
      error: `Unsupported S3 action: ${actionId}`,
    };
  },
});
