import { beforeEach, describe, expect, it } from "bun:test";
import type { MCPServerContext } from "@openbeam/types/ai";
import {
  createJsonContent,
  createResourceContent,
  createResourceRegistry,
  createTextContent,
  defineConnectorsResource,
  defineDocumentResourceTemplate,
  defineRecentDocumentsResource,
  defineSearchResultsResourceTemplate,
  defineTeamProfileResource,
  defineUserContextResource,
  extractUriParam,
  getDefaultResourceDefinitions,
  getDefaultResourceTemplates,
  ResourceRegistry,
} from "../resources";

function createTestContext(
  overrides?: Partial<MCPServerContext>
): MCPServerContext {
  return {
    teamId: "team_test",
    userId: "user_test",
    sessionId: "session_test",
    ...overrides,
  };
}

describe("ResourceRegistry", () => {
  let registry: ResourceRegistry;

  beforeEach(() => {
    registry = new ResourceRegistry();
  });

  describe("register and list", () => {
    it("registers static resources", () => {
      const definition = defineConnectorsResource();
      const handler = async () => ({ contents: [] });

      registry.register(definition, handler);

      const resources = registry.list();
      expect(resources).toHaveLength(1);
      expect(resources[0]?.uri).toBe("openbeam://connectors");
      expect(resources[0]?.name).toBe("Connected Sources");
    });

    it("lists multiple registered resources", () => {
      registry.register(defineConnectorsResource(), async () => ({
        contents: [],
      }));
      registry.register(defineRecentDocumentsResource(), async () => ({
        contents: [],
      }));
      registry.register(defineTeamProfileResource(), async () => ({
        contents: [],
      }));

      const resources = registry.list();
      expect(resources).toHaveLength(3);
    });

    it("includes all resource properties in list", () => {
      registry.register(defineConnectorsResource(), async () => ({
        contents: [],
      }));

      const [resource] = registry.list();
      expect(resource).toMatchObject({
        uri: "openbeam://connectors",
        name: "Connected Sources",
        description: "List of all active data source integrations for the team",
        mimeType: "application/json",
      });
    });
  });

  describe("registerTemplate and listTemplates", () => {
    it("registers resource templates", () => {
      const template = defineDocumentResourceTemplate();
      const handler = async () => ({ contents: [] });

      registry.registerTemplate(template, handler);

      const templates = registry.listTemplates();
      expect(templates).toHaveLength(1);
      expect(templates[0]?.uriTemplate).toBe(
        "openbeam://documents/{documentId}"
      );
    });

    it("lists multiple templates", () => {
      registry.registerTemplate(defineDocumentResourceTemplate(), async () => ({
        contents: [],
      }));
      registry.registerTemplate(
        defineSearchResultsResourceTemplate(),
        async () => ({ contents: [] })
      );

      const templates = registry.listTemplates();
      expect(templates).toHaveLength(2);
    });
  });

  describe("read", () => {
    it("reads static resources", async () => {
      const expectedContents = [
        { type: "resource" as const, uri: "test", text: "test data" },
      ];
      const handler = async () => ({ contents: expectedContents });

      registry.register(defineConnectorsResource(), handler);

      const result = await registry.read(
        "openbeam://connectors",
        createTestContext()
      );
      expect(result?.contents).toEqual(expectedContents);
    });

    it("reads template resources with matching URI", async () => {
      const handler = async (uri: string) => ({
        contents: [
          {
            type: "resource" as const,
            uri,
            text: `Document content for ${uri}`,
          },
        ],
      });

      registry.registerTemplate(defineDocumentResourceTemplate(), handler);

      const result = await registry.read(
        "openbeam://documents/doc_123",
        createTestContext()
      );
      expect(result?.contents[0]?.text).toContain("doc_123");
    });

    it("returns null for unregistered URI", async () => {
      const result = await registry.read(
        "openbeam://unknown",
        createTestContext()
      );
      expect(result).toBeNull();
    });

    it("passes context to handler", async () => {
      let receivedContext: MCPServerContext | null = null;
      const handler = (_uri: string, ctx: MCPServerContext) => {
        receivedContext = ctx;
        return Promise.resolve({ contents: [] });
      };

      registry.register(defineConnectorsResource(), handler);

      const context = createTestContext({ teamId: "team_specific" });
      await registry.read("openbeam://connectors", context);

      expect(receivedContext).toMatchObject({ teamId: "team_specific" });
    });

    it("prefers static resources over templates", async () => {
      const staticHandler = async () => ({
        contents: [
          { type: "resource" as const, uri: "static", text: "static" },
        ],
      });
      const templateHandler = async () => ({
        contents: [
          { type: "resource" as const, uri: "template", text: "template" },
        ],
      });

      registry.register(
        {
          uri: "openbeam://documents/recent",
          name: "Recent",
          description: "Recent docs",
        },
        staticHandler
      );
      registry.registerTemplate(
        defineDocumentResourceTemplate(),
        templateHandler
      );

      const result = await registry.read(
        "openbeam://documents/recent",
        createTestContext()
      );
      expect(result?.contents[0]?.text).toBe("static");
    });
  });

  describe("has", () => {
    it("returns true for registered static resource", () => {
      registry.register(defineConnectorsResource(), async () => ({
        contents: [],
      }));
      expect(registry.has("openbeam://connectors")).toBe(true);
    });

    it("returns true for matching template URI", () => {
      registry.registerTemplate(defineDocumentResourceTemplate(), async () => ({
        contents: [],
      }));
      expect(registry.has("openbeam://documents/doc_123")).toBe(true);
      expect(registry.has("openbeam://documents/any_id")).toBe(true);
    });

    it("returns false for unregistered URI", () => {
      expect(registry.has("openbeam://unknown")).toBe(false);
    });

    it("returns false for non-matching template URI", () => {
      registry.registerTemplate(defineDocumentResourceTemplate(), async () => ({
        contents: [],
      }));
      expect(registry.has("openbeam://documents")).toBe(false);
      expect(registry.has("openbeam://documents/a/b")).toBe(false);
    });
  });

  describe("clear", () => {
    it("removes all static resources", () => {
      registry.register(defineConnectorsResource(), async () => ({
        contents: [],
      }));
      registry.register(defineTeamProfileResource(), async () => ({
        contents: [],
      }));

      registry.clear();

      expect(registry.list()).toHaveLength(0);
    });

    it("removes all templates", () => {
      registry.registerTemplate(defineDocumentResourceTemplate(), async () => ({
        contents: [],
      }));

      registry.clear();

      expect(registry.listTemplates()).toHaveLength(0);
      expect(registry.has("openbeam://documents/doc_123")).toBe(false);
    });
  });
});

describe("URI Template Matching", () => {
  let registry: ResourceRegistry;

  beforeEach(() => {
    registry = new ResourceRegistry();
  });

  it("matches single parameter templates", () => {
    registry.registerTemplate(
      {
        uriTemplate: "openbeam://items/{itemId}",
        name: "Item",
        description: "An item",
      },
      async () => ({ contents: [] })
    );

    expect(registry.has("openbeam://items/123")).toBe(true);
    expect(registry.has("openbeam://items/abc-def")).toBe(true);
    expect(registry.has("openbeam://items")).toBe(false);
    expect(registry.has("openbeam://items/123/sub")).toBe(false);
  });

  it("matches multi-parameter templates", () => {
    registry.registerTemplate(
      {
        uriTemplate: "openbeam://teams/{teamId}/docs/{docId}",
        name: "Team Doc",
        description: "A team document",
      },
      async () => ({ contents: [] })
    );

    expect(registry.has("openbeam://teams/t1/docs/d1")).toBe(true);
    expect(registry.has("openbeam://teams/t1/docs")).toBe(false);
    expect(registry.has("openbeam://teams/t1")).toBe(false);
  });

  it("distinguishes between different templates", async () => {
    let calledTemplate: string | null = null;

    registry.registerTemplate(
      {
        uriTemplate: "openbeam://a/{id}",
        name: "A",
        description: "Template A",
      },
      () => {
        calledTemplate = "a";
        return Promise.resolve({ contents: [] });
      }
    );
    registry.registerTemplate(
      {
        uriTemplate: "openbeam://b/{id}",
        name: "B",
        description: "Template B",
      },
      () => {
        calledTemplate = "b";
        return Promise.resolve({ contents: [] });
      }
    );

    await registry.read("openbeam://a/123", createTestContext());
    expect(calledTemplate as unknown as string).toBe("a");

    await registry.read("openbeam://b/456", createTestContext());
    expect(calledTemplate as unknown as string).toBe("b");
  });
});

describe("extractUriParam", () => {
  it("extracts single parameter", () => {
    const result = extractUriParam(
      "openbeam://documents/doc_123",
      "openbeam://documents/{documentId}",
      "documentId"
    );
    expect(result).toBe("doc_123");
  });

  it("extracts from multi-parameter template", () => {
    const teamId = extractUriParam(
      "openbeam://teams/team_1/docs/doc_2",
      "openbeam://teams/{teamId}/docs/{docId}",
      "teamId"
    );
    expect(teamId).toBe("team_1");

    const docId = extractUriParam(
      "openbeam://teams/team_1/docs/doc_2",
      "openbeam://teams/{teamId}/docs/{docId}",
      "docId"
    );
    expect(docId).toBe("doc_2");
  });

  it("returns null for non-matching URI", () => {
    const result = extractUriParam(
      "openbeam://other/path",
      "openbeam://documents/{documentId}",
      "documentId"
    );
    expect(result).toBeNull();
  });

  it("returns null for non-existent parameter", () => {
    const result = extractUriParam(
      "openbeam://documents/doc_123",
      "openbeam://documents/{documentId}",
      "otherId"
    );
    expect(result).toBeNull();
  });
});

describe("Content Helpers", () => {
  describe("createTextContent", () => {
    it("creates text content", () => {
      const content = createTextContent("Hello, world!");
      expect(content).toEqual({ type: "text", text: "Hello, world!" });
    });
  });

  describe("createJsonContent", () => {
    it("creates formatted JSON content", () => {
      const data = { name: "test", count: 42 };
      const content = createJsonContent(data);
      expect(content.type).toBe("text");
      expect(content.text).toContain('"name": "test"');
      expect(content.text).toContain('"count": 42');
    });

    it("handles nested objects", () => {
      const data = { nested: { deep: { value: true } } };
      const content = createJsonContent(data);
      expect(content.text).toContain('"value": true');
    });
  });

  describe("createResourceContent", () => {
    it("creates resource content with required fields", () => {
      const content = createResourceContent("openbeam://test", "content text");
      expect(content).toEqual({
        type: "resource",
        uri: "openbeam://test",
        text: "content text",
        mimeType: undefined,
      });
    });

    it("includes optional mimeType", () => {
      const content = createResourceContent(
        "openbeam://test",
        "content",
        "application/json"
      );
      expect(content.mimeType).toBe("application/json");
    });
  });
});

describe("Resource Definition Factories", () => {
  it("defineConnectorsResource creates valid definition", () => {
    const def = defineConnectorsResource();
    expect(def.uri).toBe("openbeam://connectors");
    expect(def.name).toBe("Connected Sources");
    expect(def.mimeType).toBe("application/json");
  });

  it("defineDocumentResourceTemplate creates valid template", () => {
    const template = defineDocumentResourceTemplate();
    expect(template.uriTemplate).toBe("openbeam://documents/{documentId}");
    expect(template.name).toBe("Document");
  });

  it("defineRecentDocumentsResource creates valid definition", () => {
    const def = defineRecentDocumentsResource();
    expect(def.uri).toBe("openbeam://documents/recent");
  });

  it("defineSearchResultsResourceTemplate creates valid template", () => {
    const template = defineSearchResultsResourceTemplate();
    expect(template.uriTemplate).toBe("openbeam://search/{queryId}");
  });

  it("defineTeamProfileResource creates valid definition", () => {
    const def = defineTeamProfileResource();
    expect(def.uri).toBe("openbeam://team/profile");
  });

  it("defineUserContextResource creates valid definition", () => {
    const def = defineUserContextResource();
    expect(def.uri).toBe("openbeam://user/context");
  });
});

describe("getDefaultResourceDefinitions", () => {
  it("returns all default resource definitions", () => {
    const definitions = getDefaultResourceDefinitions();
    expect(definitions).toHaveLength(4);

    const uris = definitions.map((d) => d.uri);
    expect(uris).toContain("openbeam://connectors");
    expect(uris).toContain("openbeam://documents/recent");
    expect(uris).toContain("openbeam://team/profile");
    expect(uris).toContain("openbeam://user/context");
  });
});

describe("getDefaultResourceTemplates", () => {
  it("returns all default resource templates", () => {
    const templates = getDefaultResourceTemplates();
    expect(templates).toHaveLength(2);

    const uriTemplates = templates.map((t) => t.uriTemplate);
    expect(uriTemplates).toContain("openbeam://documents/{documentId}");
    expect(uriTemplates).toContain("openbeam://search/{queryId}");
  });
});

describe("createResourceRegistry", () => {
  it("creates new empty registry", () => {
    const registry = createResourceRegistry();
    expect(registry.list()).toHaveLength(0);
    expect(registry.listTemplates()).toHaveLength(0);
  });
});
