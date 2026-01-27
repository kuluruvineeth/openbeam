import type { CodeRuntime, CodeTemplate } from "@openplane/types/canvas";
import type { Icons } from "../../icons";

export type { CodeTemplate };

export type IconName = keyof typeof Icons;

export interface CodeTemplateWithIcon extends Omit<CodeTemplate, "icon"> {
  icon: IconName;
}

export const CODE_TEMPLATES: CodeTemplateWithIcon[] = [
  {
    id: "transform-basic",
    name: "Basic Transform",
    description: "Transform input data structure",
    icon: "Repeat",
    runtime: "javascript",
    category: "transform",
    code: `// Transform input data
const result = {
  ...input,
  transformed: true,
  timestamp: Date.now()
};

return result;`,
  },
  {
    id: "map-array",
    name: "Map Array",
    description: "Transform each item in an array",
    icon: "List",
    runtime: "javascript",
    category: "transform",
    code: `// Map over array items
const items = input.items || [];

const result = items.map(item => ({
  id: item.id,
  name: item.name?.toUpperCase(),
  processed: true
}));

return { items: result, count: result.length };`,
  },
  {
    id: "filter-array",
    name: "Filter Array",
    description: "Filter items by condition",
    icon: "Filter",
    runtime: "javascript",
    category: "filter",
    code: `// Filter items by condition
const items = input.items || [];

const filtered = items.filter(item => {
  return item.active === true && item.value > 0;
});

return { items: filtered, count: filtered.length };`,
  },
  {
    id: "aggregate-sum",
    name: "Aggregate Sum",
    description: "Sum values from array",
    icon: "Hash2",
    runtime: "javascript",
    category: "aggregate",
    code: `// Aggregate values from array
const items = input.items || [];

const total = items.reduce((sum, item) => {
  return sum + (item.value || 0);
}, 0);

const average = items.length > 0 ? total / items.length : 0;

return { total, average, count: items.length };`,
  },
  {
    id: "group-by",
    name: "Group By",
    description: "Group items by key",
    icon: "Layers",
    runtime: "javascript",
    category: "aggregate",
    code: `// Group items by key
const items = input.items || [];
const groupKey = 'category';

const groups = items.reduce((acc, item) => {
  const key = item[groupKey] || 'unknown';
  if (!acc[key]) acc[key] = [];
  acc[key].push(item);
  return acc;
}, {});

return { groups, keys: Object.keys(groups) };`,
  },
  {
    id: "http-get",
    name: "HTTP GET Request",
    description: "Fetch data from API",
    icon: "Globe",
    runtime: "javascript",
    category: "http",
    code: `// HTTP GET request
const url = input.url || 'https://api.example.com/data';

const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': input.token ? \`Bearer \${input.token}\` : undefined
  }
});

if (!response.ok) {
  throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
}

const data = await response.json();
return { data, status: response.status };`,
  },
  {
    id: "http-post",
    name: "HTTP POST Request",
    description: "Send data to API",
    icon: "ArrowRight",
    runtime: "javascript",
    category: "http",
    code: `// HTTP POST request
const url = input.url || 'https://api.example.com/data';
const body = input.body || {};

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': input.token ? \`Bearer \${input.token}\` : undefined
  },
  body: JSON.stringify(body)
});

if (!response.ok) {
  throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
}

const data = await response.json();
return { data, status: response.status };`,
  },
  {
    id: "parse-json",
    name: "Parse JSON",
    description: "Parse JSON string to object",
    icon: "Braces",
    runtime: "javascript",
    category: "utility",
    code: `// Parse JSON string
const jsonString = input.json || '{}';

try {
  const parsed = JSON.parse(jsonString);
  return { data: parsed, valid: true };
} catch (error) {
  return { data: null, valid: false, error: error.message };
}`,
  },
  {
    id: "format-date",
    name: "Format Date",
    description: "Format date to string",
    icon: "Calendar",
    runtime: "javascript",
    category: "utility",
    code: `// Format date
const dateInput = input.date || Date.now();
const format = input.format || 'ISO';

const date = new Date(dateInput);

let formatted;
switch (format) {
  case 'ISO':
    formatted = date.toISOString();
    break;
  case 'UTC':
    formatted = date.toUTCString();
    break;
  case 'locale':
    formatted = date.toLocaleString();
    break;
  default:
    formatted = date.toISOString();
}

return { formatted, timestamp: date.getTime() };`,
  },
  {
    id: "deduplicate",
    name: "Deduplicate Array",
    description: "Remove duplicate items",
    icon: "Copy",
    runtime: "javascript",
    category: "utility",
    code: `// Deduplicate array by key
const items = input.items || [];
const key = input.key || 'id';

const seen = new Set();
const unique = items.filter(item => {
  const value = item[key];
  if (seen.has(value)) return false;
  seen.add(value);
  return true;
});

return {
  items: unique,
  count: unique.length,
  removed: items.length - unique.length
};`,
  },
  {
    id: "python-transform",
    name: "Python Transform",
    description: "Transform with Python",
    icon: "Code2",
    runtime: "python",
    category: "transform",
    code: `# Python data transformation
import json

data = input.get('data', {})

result = {
    **data,
    'transformed': True,
    'processed_by': 'python'
}

return result`,
  },
  {
    id: "python-pandas",
    name: "Pandas DataFrame",
    description: "Process with Pandas",
    icon: "Grid3x3",
    runtime: "python",
    category: "transform",
    code: `# Pandas DataFrame processing
import pandas as pd

items = input.get('items', [])
df = pd.DataFrame(items)

# Example: filter and transform
if 'value' in df.columns:
    df = df[df['value'] > 0]
    df['normalized'] = df['value'] / df['value'].max()

return {
    'items': df.to_dict('records'),
    'count': len(df),
    'columns': list(df.columns)
}`,
  },
  {
    id: "typescript-typed",
    name: "TypeScript Typed",
    description: "Type-safe transformation",
    icon: "FileCode",
    runtime: "typescript",
    category: "transform",
    code: `// TypeScript transformation
interface InputData {
  items: Array<{ id: string; value: number }>;
}

interface OutputData {
  processed: Array<{ id: string; doubled: number }>;
  total: number;
}

const data = input as InputData;

const processed = data.items.map(item => ({
  id: item.id,
  doubled: item.value * 2
}));

const total = processed.reduce((sum, item) => sum + item.doubled, 0);

return { processed, total } as OutputData;`,
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: "transform", label: "Transform", icon: "Repeat" as const },
  { id: "filter", label: "Filter", icon: "Filter" as const },
  { id: "aggregate", label: "Aggregate", icon: "Hash2" as const },
  { id: "http", label: "HTTP", icon: "Globe" as const },
  { id: "utility", label: "Utility", icon: "Wrench" as const },
] as const;

export function getTemplatesByRuntime(
  runtime: CodeRuntime
): CodeTemplateWithIcon[] {
  return CODE_TEMPLATES.filter((t) => t.runtime === runtime);
}

export function getTemplatesByCategory(
  category: CodeTemplateWithIcon["category"]
): CodeTemplateWithIcon[] {
  return CODE_TEMPLATES.filter((t) => t.category === category);
}
