import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const jenkinsActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "jenkins",
  connectorName: "Jenkins",
  connectorIcon: "jenkins",
  actions: [
    {
      id: "build_trigger",
      name: "Trigger Build",
      description: "Trigger a Jenkins build for a job",
      connectorType: "jenkins",
      resource: "build",
      category: "create",
      stakes: "high",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "jobPath",
          name: "Job Path",
          type: "string",
          required: true,
          description: "Full Jenkins job path (e.g. folder/job-name)",
        },
      ],
      outputs: [
        { id: "id", name: "Build ID", type: "string" },
        { id: "url", name: "Build URL", type: "string" },
      ],
    },
    {
      id: "job_disable",
      name: "Disable Job",
      description: "Disable a Jenkins job",
      connectorType: "jenkins",
      resource: "job",
      category: "update",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "jobPath", name: "Job Path", type: "string", required: true },
      ],
      outputs: [{ id: "disabled", name: "Disabled", type: "boolean" }],
    },
    {
      id: "job_enable",
      name: "Enable Job",
      description: "Enable a disabled Jenkins job",
      connectorType: "jenkins",
      resource: "job",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "jobPath", name: "Job Path", type: "string", required: true },
      ],
      outputs: [{ id: "enabled", name: "Enabled", type: "boolean" }],
    },
  ],
};
