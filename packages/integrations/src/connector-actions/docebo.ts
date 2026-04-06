import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const doceboActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "docebo",
  connectorName: "Docebo",
  connectorIcon: "docebo",
  actions: [
    {
      id: "enrollment_create",
      name: "Create Enrollment",
      description: "Enroll a user in a Docebo course",
      connectorType: "docebo",
      resource: "enrollment",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "properties",
          name: "Properties",
          type: "object",
          required: true,
          description: "Enrollment properties (userId, courseId, etc.)",
        },
      ],
      outputs: [
        { id: "recordId", name: "Enrollment ID", type: "string" },
        { id: "url", name: "Enrollment URL", type: "string" },
      ],
    },
    {
      id: "course_update",
      name: "Update Course",
      description: "Update an existing Docebo course",
      connectorType: "docebo",
      resource: "course",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "courseId", name: "Course ID", type: "string", required: true },
        {
          id: "properties",
          name: "Properties",
          type: "object",
          required: false,
          description: "Fields to update",
        },
      ],
      outputs: [
        { id: "recordId", name: "Course ID", type: "string" },
        { id: "url", name: "Course URL", type: "string" },
      ],
    },
  ],
};
