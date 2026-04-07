import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const amplitudeActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "amplitude",
  connectorName: "Amplitude",
  connectorIcon: "amplitude",
  actions: [
    {
      id: "chart_annotations",
      name: "Get Chart Annotations",
      description: "Retrieve annotations for an Amplitude chart",
      connectorType: "amplitude",
      resource: "chart",
      category: "read",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: true,
      inputs: [
        {
          id: "chartId",
          name: "Chart ID",
          type: "number",
          required: true,
          description: "Amplitude chart ID",
        },
      ],
      outputs: [{ id: "id", name: "Annotation ID", type: "string" }],
    },
  ],
};
