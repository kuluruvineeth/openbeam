import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const s3ActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "s3",
  connectorName: "Amazon S3",
  connectorIcon: "s3",
  actions: [
    {
      id: "delete_object",
      name: "Delete Object",
      description: "Delete an object from the S3 bucket",
      connectorType: "s3",
      resource: "object",
      category: "delete",
      stakes: "high",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "key",
          name: "Object Key",
          type: "string",
          required: true,
          description: "Full key (path) of the object to delete",
        },
      ],
      outputs: [{ id: "key", name: "Deleted Key", type: "string" }],
    },
  ],
};
