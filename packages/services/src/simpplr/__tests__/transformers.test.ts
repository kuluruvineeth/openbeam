import { describe, expect, it } from "bun:test";
import type { SimpplrTransformContext } from "@openbeam/types/services/connectors/simpplr";
import { transformFile } from "../transformers/file";
import { transformNews } from "../transformers/news";
import { transformPage } from "../transformers/page";
import { transformPerson } from "../transformers/person";
import { transformSite } from "../transformers/site";

const CONTEXT: SimpplrTransformContext = {
  connectorId: "conn_simpplr_1",
  connectorType: "SIMPPLR",
  teamId: "team_1",
  workspaceId: "ws_1",
  instanceUrl: "https://company.simpplr.com",
};

describe("transformSite", () => {
  it("transforms a site with full details", async () => {
    const site = {
      id: "site-1",
      name: "Engineering Hub",
      description: "Central hub for engineering teams",
      siteType: "community",
      status: "active",
      memberCount: 120,
      url: "https://company.simpplr.com/site/site-1",
      owner: {
        id: "u-1",
        displayName: "Jane Doe",
        email: "jane@company.com",
      },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-06-15T00:00:00Z",
    };

    const doc = await transformSite(site, CONTEXT);

    expect(doc.id).toBe("conn_simpplr_1_site_site-1");
    expect(doc.document_type).toBe("site");
    expect(doc.title).toBe("Engineering Hub");
    expect(doc.content).toContain("Central hub for engineering teams");
    expect(doc.content).toContain("Type: community");
    expect(doc.content).toContain("Members: 120");
    expect(doc.content).toContain("Owner: Jane Doe");
    expect(doc.metadata?.siteType).toBe("community");
    expect(doc.metadata?.memberCount).toBe("120");
    expect(doc.author_name).toBe("Jane Doe");
  });

  it("transforms a minimal site", async () => {
    const site = {
      id: "site-2",
      name: "Test Site",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    const doc = await transformSite(site, CONTEXT);

    expect(doc.id).toBe("conn_simpplr_1_site_site-2");
    expect(doc.title).toBe("Test Site");
    expect(doc.metadata?.siteType).toBeUndefined();
    expect(doc.metadata?.memberCount).toBeUndefined();
  });
});

describe("transformPage", () => {
  it("transforms a page with full content", async () => {
    const page = {
      id: "pg-1",
      title: "Welcome to Simpplr",
      content: "<p>This is the <b>company</b> intranet homepage.</p>",
      summary: "Overview of the intranet",
      siteName: "General",
      status: "published",
      url: "https://company.simpplr.com/page/pg-1",
      author: {
        id: "u-1",
        displayName: "Alice Johnson",
        email: "alice@company.com",
      },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-06-15T00:00:00Z",
    };

    const doc = await transformPage(page, CONTEXT);

    expect(doc.id).toBe("conn_simpplr_1_page_pg-1");
    expect(doc.document_type).toBe("page");
    expect(doc.title).toBe("Welcome to Simpplr");
    expect(doc.content).toContain("Overview of the intranet");
    expect(doc.content).toContain("company intranet homepage");
    expect(doc.content).not.toContain("<p>");
    expect(doc.content).not.toContain("<b>");
    expect(doc.content).toContain("Site: General");
    expect(doc.content).toContain("Author: Alice Johnson");
    expect(doc.author_name).toBe("Alice Johnson");
    expect(doc.author_email).toBe("alice@company.com");
    expect(doc.metadata?.status).toBe("published");
    expect(doc.metadata?.site).toBe("General");
  });

  it("transforms a minimal page", async () => {
    const page = {
      id: "pg-2",
      title: "Empty Page",
      createdAt: "2024-03-01T00:00:00Z",
      updatedAt: "2024-03-01T00:00:00Z",
    };

    const doc = await transformPage(page, CONTEXT);

    expect(doc.id).toBe("conn_simpplr_1_page_pg-2");
    expect(doc.title).toBe("Empty Page");
    expect(doc.url).toBe("https://company.simpplr.com/page/pg-2");
    expect(doc.metadata?.site).toBeUndefined();
    expect(doc.author_name).toBeUndefined();
  });
});

describe("transformNews", () => {
  it("transforms a news article with metadata", async () => {
    const article = {
      id: "n-1",
      title: "Q1 Results Announced",
      content: "<h2>Great quarter</h2><p>Revenue up 20%.</p>",
      summary: "Financial results summary",
      category: "Finance",
      tags: ["earnings", "q1", "growth"],
      publishedAt: "2024-04-01T09:00:00Z",
      author: {
        id: "u-2",
        displayName: "Bob CFO",
        email: "bob@company.com",
      },
      createdAt: "2024-03-28T00:00:00Z",
      updatedAt: "2024-04-01T09:00:00Z",
    };

    const doc = await transformNews(article, CONTEXT);

    expect(doc.id).toBe("conn_simpplr_1_news_n-1");
    expect(doc.document_type).toBe("news");
    expect(doc.title).toBe("Q1 Results Announced");
    expect(doc.content).toContain("Revenue up 20%");
    expect(doc.content).not.toContain("<h2>");
    expect(doc.content).toContain("Category: Finance");
    expect(doc.content).toContain("Tags: earnings, q1, growth");
    expect(doc.metadata?.category).toBe("Finance");
    expect(doc.metadata?.tags).toBe("earnings, q1, growth");
    expect(doc.metadata?.publishedAt).toBe("2024-04-01T09:00:00Z");
    expect(doc.author_name).toBe("Bob CFO");
  });
});

describe("transformFile", () => {
  it("transforms a file with metadata", async () => {
    const file = {
      id: "f-1",
      title: "Employee Handbook 2024",
      description: "Complete guide for new employees",
      fileName: "handbook-2024.pdf",
      fileType: "pdf",
      fileSize: 5_242_880,
      author: {
        id: "u-3",
        displayName: "HR Team",
        email: "hr@company.com",
      },
      createdAt: "2024-01-15T00:00:00Z",
      updatedAt: "2024-06-01T00:00:00Z",
    };

    const doc = await transformFile(file, CONTEXT);

    expect(doc.id).toBe("conn_simpplr_1_file_f-1");
    expect(doc.document_type).toBe("file");
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
      id: "p-1",
      firstName: "Carol",
      lastName: "Smith",
      displayName: "Carol Smith",
      email: "carol@company.com",
      jobTitle: "Product Manager",
      department: "Product",
      location: "New York",
      phone: "+1-555-0123",
      bio: "Leads product strategy for enterprise tools",
      manager: {
        id: "p-2",
        displayName: "Dave VP",
        email: "dave@company.com",
      },
      status: "active",
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2024-02-15T00:00:00Z",
    };

    const doc = await transformPerson(person, CONTEXT);

    expect(doc.id).toBe("conn_simpplr_1_person_p-1");
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
      id: "p-3",
      displayName: "Eve Davis",
      email: "eve@company.com",
      status: "active",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    const doc = await transformPerson(person, CONTEXT);

    expect(doc.id).toBe("conn_simpplr_1_person_p-3");
    expect(doc.title).toBe("Eve Davis");
    expect(doc.content).toContain("Email: eve@company.com");
    expect(doc.metadata?.department).toBeUndefined();
    expect(doc.metadata?.manager).toBeUndefined();
  });
});
