import { describe, expect, it } from "bun:test";
import type { InteractTransformContext } from "@openbeam/types/services/connectors/interact";
import { transformDocument } from "../transformers/document";
import { transformNews } from "../transformers/news";
import { transformPage } from "../transformers/page";
import { transformPerson } from "../transformers/person";
import { transformSpace } from "../transformers/space";

const CONTEXT: InteractTransformContext = {
  connectorId: "conn_interact_1",
  connectorType: "INTERACT",
  teamId: "team_1",
  workspaceId: "ws_1",
  instanceUrl: "https://company.interactsoftware.com",
};

describe("transformPage", () => {
  it("transforms a page with full content", async () => {
    const page = {
      Id: "pg-1",
      Title: "Welcome to the Intranet",
      Content: "<p>This is the <b>company</b> intranet homepage.</p>",
      Summary: "Overview of the intranet",
      Section: "General",
      Status: "published",
      Url: "https://company.interactsoftware.com/page/pg-1",
      Author: {
        Id: "u-1",
        DisplayName: "Alice Johnson",
        Email: "alice@company.com",
      },
      CreatedDate: "2024-01-01T00:00:00Z",
      ModifiedDate: "2024-06-15T00:00:00Z",
    };

    const doc = await transformPage(page, CONTEXT);

    expect(doc.id).toBe("conn_interact_1_page_pg-1");
    expect(doc.document_type).toBe("page");
    expect(doc.title).toBe("Welcome to the Intranet");
    expect(doc.content).toContain("Overview of the intranet");
    expect(doc.content).toContain("company intranet homepage");
    expect(doc.content).not.toContain("<p>");
    expect(doc.content).not.toContain("<b>");
    expect(doc.content).toContain("Section: General");
    expect(doc.content).toContain("Author: Alice Johnson");
    expect(doc.author_name).toBe("Alice Johnson");
    expect(doc.author_email).toBe("alice@company.com");
    expect(doc.metadata?.status).toBe("published");
    expect(doc.metadata?.section).toBe("General");
    expect(doc.url).toBe("https://company.interactsoftware.com/page/pg-1");
  });

  it("transforms a minimal page", async () => {
    const page = {
      Id: "pg-2",
      Title: "Empty Page",
      Content: "",
      Status: "draft",
      CreatedDate: "2024-03-01T00:00:00Z",
      ModifiedDate: "2024-03-01T00:00:00Z",
    };

    const doc = await transformPage(page, CONTEXT);

    expect(doc.id).toBe("conn_interact_1_page_pg-2");
    expect(doc.title).toBe("Empty Page");
    expect(doc.url).toBe("https://company.interactsoftware.com/page/pg-2");
    expect(doc.metadata?.section).toBeUndefined();
    expect(doc.author_name).toBeUndefined();
  });
});

describe("transformNews", () => {
  it("transforms a news article with metadata", async () => {
    const article = {
      Id: "n-1",
      Title: "Q1 Results Announced",
      Content: "<h2>Great quarter</h2><p>Revenue up 20%.</p>",
      Summary: "Financial results summary",
      Category: "Finance",
      Tags: ["earnings", "q1", "growth"],
      PublishedDate: "2024-04-01T09:00:00Z",
      Author: {
        Id: "u-2",
        DisplayName: "Bob CFO",
        Email: "bob@company.com",
      },
      CreatedDate: "2024-03-28T00:00:00Z",
      ModifiedDate: "2024-04-01T09:00:00Z",
    };

    const doc = await transformNews(article, CONTEXT);

    expect(doc.id).toBe("conn_interact_1_news_n-1");
    expect(doc.document_type).toBe("news");
    expect(doc.title).toBe("Q1 Results Announced");
    expect(doc.content).toContain("Revenue up 20%");
    expect(doc.content).not.toContain("<h2>");
    expect(doc.content).toContain("Category: Finance");
    expect(doc.content).toContain("Tags: earnings, q1, growth");
    expect(doc.metadata?.category).toBe("Finance");
    expect(doc.metadata?.tags).toBe("earnings, q1, growth");
    expect(doc.metadata?.publishedDate).toBe("2024-04-01T09:00:00Z");
    expect(doc.author_name).toBe("Bob CFO");
  });
});

describe("transformDocument", () => {
  it("transforms a document with file metadata", async () => {
    const interactDoc = {
      Id: "d-1",
      Title: "Employee Handbook 2024",
      Description: "Complete guide for new employees",
      FileName: "handbook-2024.pdf",
      FileType: "pdf",
      FileSize: 5_242_880,
      Author: {
        Id: "u-3",
        DisplayName: "HR Team",
        Email: "hr@company.com",
      },
      CreatedDate: "2024-01-15T00:00:00Z",
      ModifiedDate: "2024-06-01T00:00:00Z",
    };

    const doc = await transformDocument(interactDoc, CONTEXT);

    expect(doc.id).toBe("conn_interact_1_document_d-1");
    expect(doc.document_type).toBe("document");
    expect(doc.title).toBe("Employee Handbook 2024");
    expect(doc.content).toContain("Complete guide for new employees");
    expect(doc.content).toContain("File: handbook-2024.pdf");
    expect(doc.content).toContain("Type: pdf");
    expect(doc.content).toContain("Size: 5.00 MB");
    expect(doc.metadata?.fileName).toBe("handbook-2024.pdf");
    expect(doc.metadata?.fileType).toBe("pdf");
    expect(doc.metadata?.fileSize).toBe("5242880");
  });
});

describe("transformPerson", () => {
  it("transforms a person with full profile", async () => {
    const person = {
      Id: "p-1",
      FirstName: "Carol",
      LastName: "Smith",
      DisplayName: "Carol Smith",
      Email: "carol@company.com",
      JobTitle: "Product Manager",
      Department: "Product",
      Location: "New York",
      Phone: "+1-555-0123",
      Bio: "Leads product strategy for enterprise tools",
      Manager: {
        Id: "p-2",
        DisplayName: "Dave VP",
        Email: "dave@company.com",
      },
      Status: "active",
      CreatedDate: "2023-01-01T00:00:00Z",
      ModifiedDate: "2024-02-15T00:00:00Z",
    };

    const doc = await transformPerson(person, CONTEXT);

    expect(doc.id).toBe("conn_interact_1_person_p-1");
    expect(doc.document_type).toBe("person");
    expect(doc.title).toBe("Carol Smith");
    expect(doc.content).toContain("Title: Product Manager");
    expect(doc.content).toContain("Department: Product");
    expect(doc.content).toContain("Location: New York");
    expect(doc.content).toContain("Manager: Dave VP");
    expect(doc.content).toContain("Email: carol@company.com");
    expect(doc.content).toContain("Phone: +1-555-0123");
    expect(doc.content).toContain("Leads product strategy");
    expect(doc.metadata?.email).toBe("carol@company.com");
    expect(doc.metadata?.jobTitle).toBe("Product Manager");
    expect(doc.metadata?.department).toBe("Product");
    expect(doc.metadata?.manager).toBe("Dave VP");
  });

  it("transforms a minimal person", async () => {
    const person = {
      Id: "p-3",
      FirstName: "Eve",
      LastName: "Davis",
      DisplayName: "Eve Davis",
      Email: "eve@company.com",
      Status: "active",
      CreatedDate: "2024-01-01T00:00:00Z",
      ModifiedDate: "2024-01-01T00:00:00Z",
    };

    const doc = await transformPerson(person, CONTEXT);

    expect(doc.id).toBe("conn_interact_1_person_p-3");
    expect(doc.title).toBe("Eve Davis");
    expect(doc.content).toContain("Email: eve@company.com");
    expect(doc.metadata?.department).toBeUndefined();
    expect(doc.metadata?.manager).toBeUndefined();
  });
});

describe("transformSpace", () => {
  it("transforms a space with full details", async () => {
    const space = {
      Id: "s-1",
      Name: "Engineering Hub",
      Description: "Community for all engineers",
      Type: "community",
      MemberCount: 150,
      Owner: {
        Id: "u-5",
        DisplayName: "Frank Lead",
        Email: "frank@company.com",
      },
      CreatedDate: "2023-06-01T00:00:00Z",
      ModifiedDate: "2024-03-01T00:00:00Z",
    };

    const doc = await transformSpace(space, CONTEXT);

    expect(doc.id).toBe("conn_interact_1_space_s-1");
    expect(doc.document_type).toBe("space");
    expect(doc.title).toBe("Engineering Hub");
    expect(doc.content).toContain("Community for all engineers");
    expect(doc.content).toContain("Type: community");
    expect(doc.content).toContain("Members: 150");
    expect(doc.content).toContain("Owner: Frank Lead");
    expect(doc.metadata?.spaceType).toBe("community");
    expect(doc.metadata?.memberCount).toBe("150");
    expect(doc.metadata?.owner).toBe("Frank Lead");
  });

  it("transforms a minimal space", async () => {
    const space = {
      Id: "s-2",
      Name: "Test Space",
      CreatedDate: "2024-01-01T00:00:00Z",
      ModifiedDate: "2024-01-01T00:00:00Z",
    };

    const doc = await transformSpace(space, CONTEXT);

    expect(doc.id).toBe("conn_interact_1_space_s-2");
    expect(doc.title).toBe("Test Space");
    expect(doc.metadata?.spaceType).toBeUndefined();
    expect(doc.metadata?.memberCount).toBeUndefined();
  });
});
