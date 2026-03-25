import { describe, expect, it } from "bun:test";
import type { MindtouchTransformContext } from "@openbeam/types/services/connectors/mindtouch";
import { transformCategory } from "../transformers/category";
import { transformPage } from "../transformers/page";
import { transformTag } from "../transformers/tag";

const CONTEXT: MindtouchTransformContext = {
  connectorId: "conn_mindtouch_1",
  connectorType: "MINDTOUCH",
  teamId: "team_1",
  workspaceId: "ws_1",
  instanceUrl: "https://testco.mindtouch.us",
};

describe("transformPage", () => {
  it("transforms a page with content and tags", async () => {
    const page = {
      "@id": "123",
      "@href": "https://testco.mindtouch.us/@api/deki/pages/123",
      "@revision": "5",
      "date.created": "2024-01-01T00:00:00Z",
      "date.modified": "2024-03-15T00:00:00Z",
      title: "Getting Started Guide",
      path: "Guides/Getting_Started",
      "uri.ui": "https://testco.mindtouch.us/Guides/Getting_Started",
      "page.parent": {
        "@id": "10",
        title: "Guides",
        path: "Guides",
      },
      tags: {
        tag: [
          { "@value": "onboarding", "@id": "t1" },
          { "@value": "tutorial", "@id": "t2" },
        ],
      },
      "user.author": {
        "@id": "u1",
        username: "jdoe",
        fullname: "Jane Doe",
        email: "jane@test.com",
      },
    };

    const htmlContent =
      "<h1>Getting Started</h1><p>Welcome to the platform.</p>";

    const doc = await transformPage(page, CONTEXT, htmlContent);

    expect(doc.id).toBe("conn_mindtouch_1_page_123");
    expect(doc.document_type).toBe("page");
    expect(doc.title).toBe("Getting Started Guide");
    expect(doc.content).toContain("Welcome to the platform");
    expect(doc.content).toContain("Tags: onboarding, tutorial");
    expect(doc.content).toContain("Author: Jane Doe");
    expect(doc.content).toContain("Parent: Guides");
    expect(doc.author_name).toBe("Jane Doe");
    expect(doc.author_email).toBe("jane@test.com");
    expect(doc.url).toBe("https://testco.mindtouch.us/Guides/Getting_Started");
    expect(doc.metadata?.revision).toBe("5");
    expect(doc.metadata?.path).toBe("Guides/Getting_Started");
    expect(doc.metadata?.parentTitle).toBe("Guides");
  });

  it("transforms a root page without parent or tags", async () => {
    const page = {
      "@id": "1",
      "@href": "https://testco.mindtouch.us/@api/deki/pages/1",
      "@revision": "1",
      "date.created": "2024-01-01T00:00:00Z",
      "date.modified": "2024-01-01T00:00:00Z",
      title: "Home",
      path: "",
      "uri.ui": "https://testco.mindtouch.us/",
    };

    const doc = await transformPage(page, CONTEXT);

    expect(doc.id).toBe("conn_mindtouch_1_page_1");
    expect(doc.document_subtype).toBe("root");
    expect(doc.metadata?.parentTitle).toBeUndefined();
    expect(doc.metadata?.tags).toBeUndefined();
  });

  it("handles a single tag object instead of array", async () => {
    const page = {
      "@id": "50",
      "@href": "https://testco.mindtouch.us/@api/deki/pages/50",
      "@revision": "2",
      "date.created": "2024-01-01T00:00:00Z",
      "date.modified": "2024-02-01T00:00:00Z",
      title: "FAQ",
      path: "FAQ",
      "uri.ui": "https://testco.mindtouch.us/FAQ",
      tags: {
        tag: { "@value": "faq", "@id": "t1" },
      },
    };

    const doc = await transformPage(page, CONTEXT);

    expect(doc.content).toContain("Tags: faq");
    expect(doc.metadata?.tags).toBe("faq");
  });
});

describe("transformCategory", () => {
  it("transforms a category with parent", async () => {
    const category = {
      "@id": "cat-1",
      "@href": "https://testco.mindtouch.us/@api/deki/site/tags/cat-1",
      title: "Product Documentation",
      path: "Product_Documentation",
      "uri.ui": "https://testco.mindtouch.us/Category:Product_Documentation",
      "date.created": "2024-01-01T00:00:00Z",
      "category.parent": {
        "@id": "cat-0",
        title: "Documentation",
      },
      pages: { "@totalcount": "15" },
    };

    const doc = await transformCategory(category, CONTEXT);

    expect(doc.id).toBe("conn_mindtouch_1_category_cat-1");
    expect(doc.document_type).toBe("category");
    expect(doc.document_subtype).toBe("subcategory");
    expect(doc.title).toBe("Product Documentation");
    expect(doc.content).toContain("Parent: Documentation");
    expect(doc.content).toContain("Pages: 15");
    expect(doc.metadata?.parentTitle).toBe("Documentation");
    expect(doc.metadata?.pageCount).toBe("15");
  });

  it("transforms a root category", async () => {
    const category = {
      "@id": "cat-0",
      "@href": "https://testco.mindtouch.us/@api/deki/site/tags/cat-0",
      title: "Documentation",
    };

    const doc = await transformCategory(category, CONTEXT);

    expect(doc.document_subtype).toBe("root");
    expect(doc.metadata?.parentTitle).toBeUndefined();
  });
});

describe("transformTag", () => {
  it("transforms a tag with page count", async () => {
    const tag = {
      "@value": "api-reference",
      "@id": "tag-1",
      "@href": "https://testco.mindtouch.us/@api/deki/site/tags/tag-1",
      type: "text",
      title: "api-reference",
      pages: { "@totalcount": "42" },
    };

    const doc = await transformTag(tag, CONTEXT);

    expect(doc.id).toBe("conn_mindtouch_1_tag_tag-1");
    expect(doc.document_type).toBe("tag");
    expect(doc.title).toBe("api-reference");
    expect(doc.content).toContain("Type: text");
    expect(doc.content).toContain("Pages: 42");
    expect(doc.metadata?.tagValue).toBe("api-reference");
    expect(doc.metadata?.pageCount).toBe("42");
  });

  it("uses @value as title when title is missing", async () => {
    const tag = {
      "@value": "troubleshooting",
      "@id": "tag-2",
      "@href": "https://testco.mindtouch.us/@api/deki/site/tags/tag-2",
      type: "text",
    };

    const doc = await transformTag(tag, CONTEXT);

    expect(doc.title).toBe("troubleshooting");
  });
});
