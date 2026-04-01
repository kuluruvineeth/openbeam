import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const niceCxoneActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "nice_cxone",
  connectorName: "NICE CXone",
  connectorIcon: "nice-cxone",
  actions: [
    {
      id: "contact_note",
      name: "Add Contact Note",
      description: "Add a note to a NICE CXone contact",
      connectorType: "nice_cxone",
      resource: "contact",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        { id: "contactId", name: "Contact ID", type: "string", required: true },
        { id: "note", name: "Note", type: "string", required: true },
      ],
      outputs: [
        { id: "recordId", name: "Note ID", type: "string" },
        { id: "url", name: "Contact URL", type: "string" },
      ],
    },
    {
      id: "contact_signal_create",
      name: "Create Contact Signal",
      description: "Create a new contact signal in NICE CXone",
      connectorType: "nice_cxone",
      resource: "contact",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "skillId",
          name: "Skill ID",
          type: "string",
          required: true,
          description: "Routing skill ID",
        },
        {
          id: "properties",
          name: "Properties",
          type: "json",
          required: false,
          description: "Signal properties",
        },
      ],
      outputs: [
        { id: "recordId", name: "Signal ID", type: "string" },
        { id: "url", name: "Signal URL", type: "string" },
      ],
    },
    {
      id: "agent_state_update",
      name: "Update Agent State",
      description: "Change an agent's state in NICE CXone",
      connectorType: "nice_cxone",
      resource: "agent",
      category: "update",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "agentId", name: "Agent ID", type: "string", required: true },
        {
          id: "state",
          name: "State",
          type: "string",
          required: true,
          description: "Target agent state (available, unavailable, etc.)",
        },
      ],
      outputs: [
        { id: "recordId", name: "Agent ID", type: "string" },
        { id: "url", name: "Agent URL", type: "string" },
      ],
    },
  ],
};
