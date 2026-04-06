import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const greenhouseActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "greenhouse",
  connectorName: "Greenhouse",
  connectorIcon: "greenhouse",
  actions: [
    {
      id: "add_candidate_note",
      name: "Add Candidate Note",
      description: "Add a note to a candidate's activity feed in Greenhouse",
      connectorType: "greenhouse",
      resource: "candidate",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "candidate_id",
          name: "Candidate ID",
          type: "number",
          required: true,
          description: "Greenhouse candidate ID",
        },
        {
          id: "body",
          name: "Note Body",
          type: "string",
          required: true,
          description: "Content of the note",
        },
        {
          id: "user_id",
          name: "User ID",
          type: "number",
          required: true,
          description: "Greenhouse user ID of the note author",
        },
      ],
      outputs: [{ id: "id", name: "Note ID", type: "number" }],
    },
  ],
};
