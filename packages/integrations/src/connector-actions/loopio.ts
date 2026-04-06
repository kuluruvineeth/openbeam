import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const loopioActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "loopio",
  connectorName: "Loopio",
  connectorIcon: "loopio",
  actions: [
    {
      id: "library_entry_create",
      name: "Create Library Entry",
      description:
        "Create a new Q&A entry in the Loopio library. Requires a stack ID and question text.",
      connectorType: "loopio",
      resource: "library_entry",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "stackID",
          name: "Stack ID",
          type: "number",
          required: true,
          description:
            "Integer ID of the stack to place the entry in. Use List Stacks to discover IDs.",
        },
        {
          id: "questionText",
          name: "Question Text",
          type: "string",
          required: true,
          description: "The question for the library entry.",
        },
        {
          id: "text",
          name: "Answer Text",
          type: "string",
          required: true,
          description: "The answer text for the library entry.",
        },
        {
          id: "categoryID",
          name: "Category ID",
          type: "number",
          required: false,
          description: "Integer ID of the category within the stack.",
        },
        {
          id: "subCategoryID",
          name: "Sub-Category ID",
          type: "number",
          required: false,
          description: "Integer ID of the sub-category within the category.",
        },
        {
          id: "languageCode",
          name: "Language Code",
          type: "string",
          required: false,
          description: 'Language code, e.g. "en" for English.',
        },
        {
          id: "tags",
          name: "Tags",
          type: "array",
          required: false,
          description: "Tags to associate with the library entry.",
        },
      ],
      outputs: [
        { id: "id", name: "Entry ID", type: "number" },
        { id: "url", name: "Entry URL", type: "string" },
      ],
    },
    {
      id: "library_entry_update",
      name: "Update Library Entry",
      description:
        'Update a property of an existing Loopio library entry using JSON Patch semantics. Use op "replace" with a path like "/answer/text" to update the answer.',
      connectorType: "loopio",
      resource: "library_entry",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "libraryEntryId",
          name: "Library Entry ID",
          type: "number",
          required: true,
          description: "Integer ID of the library entry to update.",
        },
        {
          id: "op",
          name: "Operation",
          type: "string",
          required: true,
          description: 'JSON Patch operation: "replace" or "add".',
        },
        {
          id: "path",
          name: "Path",
          type: "string",
          required: true,
          description:
            'JSON Pointer to the property to update. Must start with /. Examples: "/answer/text", "/questions/0/text".',
        },
        {
          id: "value",
          name: "Value",
          type: "string",
          required: true,
          description: "The new value to set at the given path.",
        },
      ],
      outputs: [
        { id: "id", name: "Entry ID", type: "number" },
        { id: "url", name: "Entry URL", type: "string" },
      ],
    },
  ],
};
