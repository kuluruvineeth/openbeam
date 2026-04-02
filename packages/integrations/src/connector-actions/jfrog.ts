import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const jfrogActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "jfrog",
  connectorName: "JFrog Artifactory",
  connectorIcon: "jfrog",
  actions: [
    {
      id: "artifact_copy",
      name: "Copy Artifact",
      description: "Copy an artifact between JFrog repositories",
      connectorType: "jfrog",
      resource: "artifact",
      category: "create",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "srcRepo",
          name: "Source Repository",
          type: "string",
          required: true,
        },
        { id: "srcPath", name: "Source Path", type: "string", required: true },
        {
          id: "destRepo",
          name: "Destination Repository",
          type: "string",
          required: true,
        },
        {
          id: "destPath",
          name: "Destination Path",
          type: "string",
          required: true,
        },
      ],
      outputs: [
        { id: "id", name: "Artifact ID", type: "string" },
        { id: "url", name: "Artifact URL", type: "string" },
      ],
    },
    {
      id: "artifact_delete",
      name: "Delete Artifact",
      description: "Delete an artifact from a JFrog repository",
      connectorType: "jfrog",
      resource: "artifact",
      category: "delete",
      stakes: "high",
      reversible: false,
      batchSupport: false,
      inputs: [
        { id: "repo", name: "Repository", type: "string", required: true },
        { id: "path", name: "Artifact Path", type: "string", required: true },
      ],
      outputs: [{ id: "id", name: "Artifact ID", type: "string" }],
    },
    {
      id: "artifact_set_properties",
      name: "Set Artifact Properties",
      description: "Set properties on a JFrog artifact",
      connectorType: "jfrog",
      resource: "artifact",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "repo", name: "Repository", type: "string", required: true },
        { id: "path", name: "Artifact Path", type: "string", required: true },
        {
          id: "properties",
          name: "Properties",
          type: "object",
          required: false,
          description: "Key-value property pairs",
        },
      ],
      outputs: [{ id: "id", name: "Artifact ID", type: "string" }],
    },
  ],
};
