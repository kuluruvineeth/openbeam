import { updateDeviceShadow } from "../../aws-iot/actions";
import { registerHandler } from "../handler-registry";

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

registerHandler({
  connectorType: "aws-iot",
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
