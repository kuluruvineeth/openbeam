import { getChartAnnotations } from "../../amplitude/actions";
import {
  type AmplitudeClient,
  createAmplitudeClient,
} from "../../amplitude/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: AmplitudeClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async chart_annotations(client, p) {
    const chartId =
      typeof p.chartId === "number" ? p.chartId : Number(p.chartId);
    if (Number.isNaN(chartId)) {
      return { success: false, data: {}, error: "chartId is required" };
    }
    const r = await getChartAnnotations(client, { chartId });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "amplitude",
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Amplitude action: ${actionId}`,
      };
    }

    const client = createAmplitudeClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
      secretKey: (credentials.config.secretKey as string) ?? "",
    });

    return await handler(client, params);
  },
});
