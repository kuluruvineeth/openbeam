import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const awsIotActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "aws_iot",
  connectorName: "AWS IoT Core",
  connectorIcon: "aws-iot",
  actions: [
    {
      id: "shadow_update",
      name: "Update Device Shadow",
      description: "Update the desired state of an IoT thing shadow",
      connectorType: "aws_iot",
      resource: "shadow",
      category: "update",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "thing_name",
          name: "Thing Name",
          type: "string",
          required: true,
        },
        {
          id: "desired_state",
          name: "Desired State",
          type: "object",
          required: true,
          description: "JSON object of desired shadow state",
        },
      ],
      outputs: [{ id: "thingName", name: "Thing Name", type: "string" }],
    },
  ],
};
