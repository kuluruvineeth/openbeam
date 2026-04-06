import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const smartThingsActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "smartthings",
  connectorName: "SmartThings",
  connectorIcon: "smartthings",
  actions: [
    {
      id: "device_command",
      name: "Execute Device Command",
      description:
        "Execute a command on a SmartThings device (on/off, setLevel, lock/unlock)",
      connectorType: "smartthings",
      resource: "device",
      category: "update",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        { id: "device_id", name: "Device ID", type: "string", required: true },
        {
          id: "capability",
          name: "Capability",
          type: "string",
          required: true,
          description: "e.g., switch, switchLevel, lock, thermostatMode",
        },
        {
          id: "command",
          name: "Command",
          type: "string",
          required: true,
          description: "e.g., on, off, setLevel, lock, unlock",
        },
        {
          id: "args",
          name: "Arguments",
          type: "array",
          required: false,
          description: "Command arguments (e.g., [50] for setLevel 50%)",
        },
      ],
      outputs: [
        { id: "deviceId", name: "Device ID", type: "string" },
        { id: "status", name: "Command Status", type: "string" },
      ],
    },
  ],
};
