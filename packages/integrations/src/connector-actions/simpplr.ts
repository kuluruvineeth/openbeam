import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const simpplrActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "simpplr",
  connectorName: "Simpplr",
  connectorIcon: "simpplr",
  actions: [
    {
      id: "page_create",
      name: "Create Page",
      description:
        "Create a new page in a Simpplr site. Posts to the centralized API at api.ec.simpplr.com with form-encoded body.",
      connectorType: "simpplr",
      resource: "page",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "siteId",
          name: "Site ID",
          type: "string",
          required: true,
          description: "Simpplr site ID to create the page under",
        },
        { id: "title", name: "Title", type: "string", required: true },
        {
          id: "body",
          name: "Body",
          type: "html",
          required: true,
          description: "HTML content body of the page",
        },
        {
          id: "contentSubType",
          name: "Content Sub-Type",
          type: "string",
          required: true,
          description: "Content type: 'news' or 'knowledge'",
        },
        {
          id: "categoryName",
          name: "Category Name",
          type: "string",
          required: true,
          description: "Category assigned to this page",
        },
        {
          id: "publishingStatus",
          name: "Publishing Status",
          type: "string",
          required: false,
          description: "Publishing status: 'immediate' (default) or 'schedule'",
        },
        {
          id: "summary",
          name: "Summary",
          type: "string",
          required: false,
          description: "Short summary of the page content",
        },
        {
          id: "publishAt",
          name: "Publish At",
          type: "string",
          required: false,
          description:
            "ISO 8601 datetime for scheduled publishing (when publishingStatus is 'schedule')",
        },
      ],
      outputs: [
        { id: "id", name: "Content ID", type: "string" },
        { id: "url", name: "Page URL", type: "string" },
      ],
    },
    {
      id: "page_update",
      name: "Update Page",
      description:
        "Update an existing Simpplr page. Uses PUT with JSON body at api.ec.simpplr.com.",
      connectorType: "simpplr",
      resource: "page",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "siteId",
          name: "Site ID",
          type: "string",
          required: true,
          description: "Simpplr site ID the page belongs to",
        },
        {
          id: "contentId",
          name: "Content ID",
          type: "string",
          required: true,
          description: "ID of the page to update",
        },
        { id: "title", name: "Title", type: "string", required: false },
        {
          id: "body",
          name: "Body",
          type: "html",
          required: false,
          description: "Updated HTML content body",
        },
        {
          id: "summary",
          name: "Summary",
          type: "string",
          required: false,
          description: "Updated summary",
        },
      ],
      outputs: [
        { id: "id", name: "Content ID", type: "string" },
        { id: "url", name: "Page URL", type: "string" },
      ],
    },
  ],
};
