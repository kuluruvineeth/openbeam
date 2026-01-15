import type {
  MCPResource,
  MCPResourceContent,
  MCPResourceDefinition,
  MCPResourceReadResult,
  MCPResourceTemplate,
  MCPServerContext,
  MCPTextContent,
} from "@openplane/types/ai";

export type ResourceHandler = (
  uri: string,
  context: MCPServerContext
) => Promise<MCPResourceReadResult>;

interface RegisteredResource {
  definition: MCPResourceDefinition;
  handler: ResourceHandler;
}

interface RegisteredTemplate {
  template: MCPResourceTemplate;
  handler: ResourceHandler;
  matcher: (uri: string) => Record<string, string> | null;
}

export class ResourceRegistry {
  private readonly resources = new Map<string, RegisteredResource>();
  private readonly templates: RegisteredTemplate[] = [];

  register(definition: MCPResourceDefinition, handler: ResourceHandler): void {
    this.resources.set(definition.uri, { definition, handler });
  }

  registerTemplate(
    template: MCPResourceTemplate,
    handler: ResourceHandler
  ): void {
    const matcher = createUriMatcher(template.uriTemplate);
    this.templates.push({ template, handler, matcher });
  }

  list(): MCPResource[] {
    return Array.from(this.resources.values()).map(({ definition }) => ({
      uri: definition.uri,
      name: definition.name,
      description: definition.description,
      mimeType: definition.mimeType,
    }));
  }

  listTemplates(): MCPResourceTemplate[] {
    return this.templates.map(({ template }) => template);
  }

  read(
    uri: string,
    context: MCPServerContext
  ): Promise<MCPResourceReadResult | null> {
    const staticResource = this.resources.get(uri);
    if (staticResource) {
      return staticResource.handler(uri, context);
    }

    for (const { handler, matcher } of this.templates) {
      const params = matcher(uri);
      if (params) {
        return handler(uri, context);
      }
    }

    return Promise.resolve(null);
  }

  has(uri: string): boolean {
    if (this.resources.has(uri)) {
      return true;
    }

    return this.templates.some(({ matcher }) => matcher(uri) !== null);
  }

  clear(): void {
    this.resources.clear();
    this.templates.length = 0;
  }
}

function createUriMatcher(
  template: string
): (uri: string) => Record<string, string> | null {
  const parts = template.split("/");
  const paramIndices: Array<{ index: number; name: string }> = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part?.startsWith("{") && part.endsWith("}")) {
      paramIndices.push({ index: i, name: part.slice(1, -1) });
    }
  }

  return (uri: string) => {
    const uriParts = uri.split("/");
    if (uriParts.length !== parts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < parts.length; i++) {
      const templatePart = parts[i];
      const uriPart = uriParts[i];

      if (templatePart === undefined || uriPart === undefined) {
        return null;
      }

      const paramInfo = paramIndices.find((p) => p.index === i);
      if (paramInfo) {
        params[paramInfo.name] = uriPart;
      } else if (templatePart !== uriPart) {
        return null;
      }
    }

    return params;
  };
}

export function extractUriParam(
  uri: string,
  template: string,
  paramName: string
): string | null {
  const matcher = createUriMatcher(template);
  const params = matcher(uri);
  return params?.[paramName] ?? null;
}

export function createTextContent(text: string): MCPTextContent {
  return { type: "text", text };
}

export function createJsonContent(data: unknown): MCPTextContent {
  return { type: "text", text: JSON.stringify(data, null, 2) };
}

export function createResourceContent(
  uri: string,
  text: string,
  mimeType?: string
): MCPResourceContent {
  return { type: "resource", uri, text, mimeType };
}

export const resourceRegistry = new ResourceRegistry();

export interface ConnectorsResourceData {
  id: string;
  name: string;
  type: string;
  status: "active" | "inactive" | "error";
  lastSyncAt?: string;
}

export interface DocumentResourceData {
  id: string;
  title: string;
  content: string;
  sourceConnector: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResultResourceData {
  query: string;
  results: Array<{
    id: string;
    title: string;
    snippet: string;
    score: number;
    source: string;
  }>;
  totalCount: number;
}

export function defineConnectorsResource(): MCPResourceDefinition {
  return {
    uri: "openplane://connectors",
    name: "Connected Sources",
    description: "List of all active data source integrations for the team",
    mimeType: "application/json",
  };
}

export function defineDocumentResourceTemplate(): MCPResourceTemplate {
  return {
    uriTemplate: "openplane://documents/{documentId}",
    name: "Document",
    description: "Full content of a specific document by ID",
    mimeType: "application/json",
  };
}

export function defineRecentDocumentsResource(): MCPResourceDefinition {
  return {
    uri: "openplane://documents/recent",
    name: "Recent Documents",
    description: "Documents indexed in the last 24 hours",
    mimeType: "application/json",
  };
}

export function defineSearchResultsResourceTemplate(): MCPResourceTemplate {
  return {
    uriTemplate: "openplane://search/{queryId}",
    name: "Search Results",
    description: "Cached search results for a specific query ID",
    mimeType: "application/json",
  };
}

export function defineTeamProfileResource(): MCPResourceDefinition {
  return {
    uri: "openplane://team/profile",
    name: "Team Profile",
    description: "Current team information and settings",
    mimeType: "application/json",
  };
}

export function defineUserContextResource(): MCPResourceDefinition {
  return {
    uri: "openplane://user/context",
    name: "User Context",
    description: "Current user context including permissions and preferences",
    mimeType: "application/json",
  };
}

export function getDefaultResourceDefinitions(): MCPResourceDefinition[] {
  return [
    defineConnectorsResource(),
    defineRecentDocumentsResource(),
    defineTeamProfileResource(),
    defineUserContextResource(),
  ];
}

export function getDefaultResourceTemplates(): MCPResourceTemplate[] {
  return [
    defineDocumentResourceTemplate(),
    defineSearchResultsResourceTemplate(),
  ];
}

export function createResourceRegistry(): ResourceRegistry {
  return new ResourceRegistry();
}
