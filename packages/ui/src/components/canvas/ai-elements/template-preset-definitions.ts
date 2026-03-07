import type {
  TemplateNodeConfig,
  TemplatePreset,
  TemplateVariable,
} from "@openbeam/types/canvas";

interface PresetDefinition {
  id: TemplatePreset;
  name: string;
  description: string;
  icon: string;
  template: string;
  variables: TemplateVariable[];
  outputFormat: TemplateNodeConfig["outputFormat"];
}

export const TEMPLATE_PRESETS: PresetDefinition[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Start from scratch",
    icon: "FileText",
    template: "",
    variables: [],
    outputFormat: "text",
  },
  {
    id: "email",
    name: "Email",
    description: "Email body template",
    icon: "Mail",
    template: `Hi {{recipientName}},

{{body}}

Best regards,
{{senderName}}`,
    variables: [
      {
        id: "recipient",
        name: "recipientName",
        type: "string",
        required: true,
        source: "detected",
      },
      {
        id: "body",
        name: "body",
        type: "string",
        required: true,
        source: "detected",
      },
      {
        id: "sender",
        name: "senderName",
        type: "string",
        required: true,
        source: "detected",
      },
    ],
    outputFormat: "text",
  },
  {
    id: "notification",
    name: "Notification",
    description: "Alert or notification message",
    icon: "Bell",
    template: `[{{level}}] {{title}}

{{message}}

{{#if actionUrl}}
Action: {{actionUrl}}
{{/if}}`,
    variables: [
      {
        id: "level",
        name: "level",
        type: "string",
        required: true,
        source: "detected",
      },
      {
        id: "title",
        name: "title",
        type: "string",
        required: true,
        source: "detected",
      },
      {
        id: "message",
        name: "message",
        type: "string",
        required: true,
        source: "detected",
      },
      {
        id: "action",
        name: "actionUrl",
        type: "string",
        required: false,
        source: "detected",
      },
    ],
    outputFormat: "text",
  },
  {
    id: "report",
    name: "Report",
    description: "Structured report output",
    icon: "BarChart",
    template: `# {{title}}

**Generated:** {{timestamp}}
**Author:** {{author}}

## Summary
{{summary}}

## Details
{{#each items}}
- **{{this.name}}**: {{this.value}}
{{/each}}

## Conclusion
{{conclusion}}`,
    variables: [
      {
        id: "title",
        name: "title",
        type: "string",
        required: true,
        source: "detected",
      },
      {
        id: "timestamp",
        name: "timestamp",
        type: "string",
        required: true,
        source: "detected",
      },
      {
        id: "author",
        name: "author",
        type: "string",
        required: true,
        source: "detected",
      },
      {
        id: "summary",
        name: "summary",
        type: "string",
        required: true,
        source: "detected",
      },
      {
        id: "items",
        name: "items",
        type: "array",
        required: true,
        source: "detected",
      },
      {
        id: "conclusion",
        name: "conclusion",
        type: "string",
        required: true,
        source: "detected",
      },
    ],
    outputFormat: "markdown",
  },
  {
    id: "api_response",
    name: "API Response",
    description: "JSON API response",
    icon: "Braces",
    template: `{
  "status": "{{status}}",
  "data": {{json data}},
  "meta": {
    "timestamp": "{{timestamp}}",
    "version": "{{version}}"
  }
}`,
    variables: [
      {
        id: "status",
        name: "status",
        type: "string",
        required: true,
        source: "detected",
      },
      {
        id: "data",
        name: "data",
        type: "object",
        required: true,
        source: "detected",
      },
      {
        id: "timestamp",
        name: "timestamp",
        type: "string",
        required: true,
        source: "detected",
      },
      {
        id: "version",
        name: "version",
        type: "string",
        required: false,
        source: "detected",
        defaultValue: "1.0",
      },
    ],
    outputFormat: "json",
  },
  {
    id: "prompt",
    name: "LLM Prompt",
    description: "Prompt template for AI",
    icon: "Sparkles",
    template: `You are a helpful assistant.

Context:
{{context}}

User Request:
{{userQuery}}

{{#if constraints}}
Constraints:
{{#each constraints}}
- {{this}}
{{/each}}
{{/if}}

Please provide a {{responseFormat}} response.`,
    variables: [
      {
        id: "context",
        name: "context",
        type: "string",
        required: true,
        source: "detected",
      },
      {
        id: "query",
        name: "userQuery",
        type: "string",
        required: true,
        source: "detected",
      },
      {
        id: "constraints",
        name: "constraints",
        type: "array",
        required: false,
        source: "detected",
      },
      {
        id: "format",
        name: "responseFormat",
        type: "string",
        required: true,
        source: "detected",
        defaultValue: "concise",
      },
    ],
    outputFormat: "text",
  },
  {
    id: "structured_output",
    name: "Structured Output",
    description: "Transform data to structure",
    icon: "FileSpreadsheet",
    template: `| Field | Value |
|-------|-------|
{{#each fields}}
| {{this.label}} | {{this.value}} |
{{/each}}`,
    variables: [
      {
        id: "fields",
        name: "fields",
        type: "array",
        required: true,
        source: "detected",
      },
    ],
    outputFormat: "markdown",
  },
  {
    id: "data_transform",
    name: "Data Transform",
    description: "Transform JSON data",
    icon: "Repeat",
    template: `{
  "transformed": {
    "id": "{{input.id}}",
    "name": "{{input.firstName}} {{input.lastName}}",
    "email": "{{input.email}}",
    "createdAt": "{{formatDate input.createdAt 'YYYY-MM-DD'}}"
  }
}`,
    variables: [
      {
        id: "input",
        name: "input",
        type: "object",
        required: true,
        source: "input",
      },
    ],
    outputFormat: "json",
  },
];

export function getPresetById(
  id: TemplatePreset
): PresetDefinition | undefined {
  return TEMPLATE_PRESETS.find((p) => p.id === id);
}
