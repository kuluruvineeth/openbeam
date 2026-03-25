import { describe, expect, it } from "bun:test";
import type { LucidTransformContext } from "@openbeam/types/services/connectors/lucid";
import { transformLucidDocument } from "../transformers/document";
import { transformLucidFolder } from "../transformers/folder";
import { transformLucidPage } from "../transformers/page";

const context: LucidTransformContext = {
  connectorId: "conn_lucid_1",
  connectorType: "LUCID",
  teamId: "team_1",
  workspaceId: "ws_1",
  accountId: "acc_1",
};

describe("transformLucidDocument", () => {
  it("transforms a document with all fields", () => {
    const doc = {
      id: "doc_abc",
      title: "System Architecture",
      product: "lucidchart",
      creatorId: "user_1",
      creatorName: "Alice",
      lastEditorId: "user_2",
      lastEditorName: "Bob",
      status: "active",
      createdDate: "2026-01-10T12:00:00Z",
      lastModifiedDate: "2026-03-20T14:30:00Z",
      parentFolderId: "folder_1",
      editUrl: "https://lucid.app/lucidchart/doc_abc/edit",
      viewUrl: "https://lucid.app/lucidchart/doc_abc/view",
      pageCount: 3,
    };

    const result = transformLucidDocument(doc, context);

    expect(result.id).toBe("conn_lucid_1_document_doc_abc");
    expect(result.document_type).toBe("document");
    expect(result.title).toBe("System Architecture");
    expect(result.url).toBe("https://lucid.app/lucidchart/doc_abc/edit");
    expect(result.author_name).toBe("Alice");
    expect(result.metadata?.product).toBe("lucidchart");
    expect(result.metadata?.status).toBe("active");
    expect(result.metadata?.pageCount).toBe("3");
    expect(result.metadata?.parentFolderId).toBe("folder_1");
    expect(result.metadata?.lastEditorName).toBe("Bob");
    expect(result.connector_id).toBe("conn_lucid_1");
    expect(result.team_id).toBe("team_1");
  });

  it("handles document with minimal fields", () => {
    const doc = {
      id: "doc_min",
      title: "Quick Sketch",
      product: "lucidspark",
      creatorId: "user_1",
      creatorName: "Alice",
      lastEditorId: "user_1",
      lastEditorName: "Alice",
      status: "",
      createdDate: "2026-03-01T08:00:00Z",
      lastModifiedDate: "2026-03-01T08:00:00Z",
      parentFolderId: null,
      editUrl: "",
      viewUrl: "https://lucid.app/lucidspark/doc_min/view",
      pageCount: 1,
    };

    const result = transformLucidDocument(doc, context);

    expect(result.id).toBe("conn_lucid_1_document_doc_min");
    expect(result.title).toBe("Quick Sketch");
    expect(result.url).toBe("https://lucid.app/lucidspark/doc_min/view");
    expect(result.metadata?.parentFolderId).toBeUndefined();
  });
});

describe("transformLucidFolder", () => {
  it("transforms a folder with parent", () => {
    const folder = {
      id: "folder_abc",
      name: "Engineering Diagrams",
      parentId: "folder_root",
      type: "folder",
      createdDate: "2026-01-05T10:00:00Z",
      lastModifiedDate: "2026-02-15T16:00:00Z",
    };

    const result = transformLucidFolder(folder, context);

    expect(result.id).toBe("conn_lucid_1_folder_folder_abc");
    expect(result.document_type).toBe("folder");
    expect(result.title).toBe("Engineering Diagrams");
    expect(result.metadata?.parentId).toBe("folder_root");
    expect(result.metadata?.folderType).toBe("folder");
  });

  it("transforms a root folder", () => {
    const folder = {
      id: "folder_root",
      name: "My Documents",
      parentId: null,
      type: "root",
      createdDate: "2025-12-01T00:00:00Z",
      lastModifiedDate: "2026-03-20T00:00:00Z",
    };

    const result = transformLucidFolder(folder, context);

    expect(result.id).toBe("conn_lucid_1_folder_folder_root");
    expect(result.title).toBe("My Documents");
    expect(result.metadata?.parentId).toBeUndefined();
  });
});

describe("transformLucidPage", () => {
  it("transforms a page with title", () => {
    const page = {
      id: "page_1",
      title: "Overview",
      index: 0,
      documentId: "doc_abc",
    };

    const result = transformLucidPage(
      page,
      "System Architecture",
      "https://lucid.app/lucidchart/doc_abc/edit",
      context
    );

    expect(result.id).toBe("conn_lucid_1_page_doc_abc_page_1");
    expect(result.document_type).toBe("page");
    expect(result.title).toBe("Overview");
    expect(result.metadata?.documentId).toBe("doc_abc");
    expect(result.metadata?.documentTitle).toBe("System Architecture");
    expect(result.metadata?.pageIndex).toBe("0");
    expect(result.url).toBe("https://lucid.app/lucidchart/doc_abc/edit");
  });

  it("uses default title when page title is empty", () => {
    const page = {
      id: "page_2",
      title: "",
      index: 1,
      documentId: "doc_abc",
    };

    const result = transformLucidPage(
      page,
      "Diagram",
      "https://lucid.app/lucidchart/doc_abc/edit",
      context
    );

    expect(result.title).toBe("Page 2");
  });
});
