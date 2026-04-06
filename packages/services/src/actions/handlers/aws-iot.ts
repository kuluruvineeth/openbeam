import { updateDeviceShadow } from "../../aws-iot/actions";
import { registerHandler } from "../handler-registry";
import { str } from "./shared/params";

registerHandler({
  connectorType: "aws-iot",
  supportedActions: ["shadow_update"],
  async execute(actionId, params) {
    if (actionId === "shadow_update") {
      const desiredState =
        typeof params.desiredState === "object" && params.desiredState !== null
          ? (params.desiredState as Record<string, unknown>)
          : {};
      const r = await updateDeviceShadow(
        str(params, "thingName"),
        desiredState
      );
      if (!r.success) {
        return { success: false, data: {}, error: r.error };
      }
      return { success: true, data: { thingName: r.thingName } };
    }

    return {
      success: false,
      data: {},
      error: `Unsupported AWS IoT action: ${actionId}`,
    };
  },
});
