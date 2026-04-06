import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const ironcladActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "ironclad",
  connectorName: "Ironclad",
  connectorIcon: "ironclad",
  actions: [
    {
      id: "workflow_create",
      name: "Create Workflow",
      description: "Launch a new contract workflow in Ironclad",
      connectorType: "ironclad",
      resource: "workflow",
      category: "create",
      stakes: "high",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "templateId",
          name: "Template ID",
          type: "string",
          required: true,
          description: "Workflow template ID",
        },
        {
          id: "attributes",
          name: "Attributes",
          type: "object",
          required: false,
          description: "Workflow attribute values",
        },
      ],
      outputs: [
        { id: "id", name: "Workflow ID", type: "string" },
        { id: "url", name: "Workflow URL", type: "string" },
      ],
    },
    {
      id: "workflow_update",
      name: "Update Workflow",
      description: "Update attributes on an Ironclad workflow",
      connectorType: "ironclad",
      resource: "workflow",
      category: "update",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "workflowId",
          name: "Workflow ID",
          type: "string",
          required: true,
        },
        {
          id: "attributes",
          name: "Attributes",
          type: "object",
          required: false,
        },
      ],
      outputs: [
        { id: "id", name: "Workflow ID", type: "string" },
        { id: "url", name: "Workflow URL", type: "string" },
      ],
    },
    {
      id: "comment_add",
      name: "Add Comment",
      description: "Add a comment to an Ironclad workflow",
      connectorType: "ironclad",
      resource: "workflow",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "workflowId",
          name: "Workflow ID",
          type: "string",
          required: true,
        },
        { id: "body", name: "Comment Body", type: "string", required: true },
      ],
      outputs: [{ id: "id", name: "Comment ID", type: "string" }],
    },
  ],
};
