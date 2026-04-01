import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const loopioActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "loopio",
  connectorName: "Loopio",
  connectorIcon: "loopio",
  actions: [
    {
      id: "library_entry_create",
      name: "Create Library Entry",
      description: "Create a new Q&A entry in the Loopio library",
      connectorType: "loopio",
      resource: "library_entry",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        { id: "question", name: "Question", type: "string", required: true },
        { id: "answer", name: "Answer", type: "string", required: true },
        { id: "category", name: "Category", type: "string", required: false },
        { id: "tags", name: "Tags", type: "array", required: false },
      ],
      outputs: [
        { id: "id", name: "Entry ID", type: "string" },
        { id: "url", name: "Entry URL", type: "string" },
      ],
    },
    {
      id: "library_entry_update",
      name: "Update Library Entry",
      description: "Update an existing Loopio library entry",
      connectorType: "loopio",
      resource: "library_entry",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "entryId", name: "Entry ID", type: "string", required: true },
        { id: "question", name: "Question", type: "string", required: false },
        { id: "answer", name: "Answer", type: "string", required: false },
        { id: "category", name: "Category", type: "string", required: false },
        { id: "tags", name: "Tags", type: "array", required: false },
      ],
      outputs: [
        { id: "id", name: "Entry ID", type: "string" },
        { id: "url", name: "Entry URL", type: "string" },
      ],
    },
  ],
};
