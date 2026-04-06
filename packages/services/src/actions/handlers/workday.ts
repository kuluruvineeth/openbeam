import { updateWorker } from "../../workday/actions";
import { registerHandler } from "../handler-registry";

registerHandler({
  connectorType: "workday",
  supportedActions: ["worker_update"],
  execute(actionId, params) {
    if (actionId === "worker_update") {
      const workerId =
        typeof params.workerId === "string" ? params.workerId : "";
      const fields =
        typeof params.fields === "object" && params.fields !== null
          ? (params.fields as Record<string, unknown>)
          : params;
      const r = updateWorker(workerId, fields);
      if (!r.success) {
        return Promise.resolve({ success: false, data: {}, error: r.error });
      }
      return Promise.resolve({
        success: true,
        data: { workerId: r.workerId },
      });
    }

    return Promise.resolve({
      success: false,
      data: {},
      error: `Unsupported Workday action: ${actionId}`,
    });
  },
});
