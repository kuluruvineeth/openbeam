import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const lookerStudioActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "looker_studio",
  connectorName: "Looker Studio",
  connectorIcon: "looker-studio",
  actions: [
    {
      id: "report_metadata",
      name: "Get Report Metadata",
      description: "Retrieve metadata for a Looker Studio report",
      connectorType: "looker_studio",
      resource: "report",
      category: "read",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        { id: "reportId", name: "Report ID", type: "string", required: true },
      ],
      outputs: [
        { id: "reportId", name: "Report ID", type: "string" },
        { id: "url", name: "Report URL", type: "string" },
      ],
    },
  ],
};
