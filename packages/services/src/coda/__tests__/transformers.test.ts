import { describe, expect, it } from "bun:test";
import type { CodaTransformContext } from "@openbeam/types/services/connectors/coda";
import type { CodaDoc } from "../api/docs";
import type { CodaPage } from "../api/pages";
import type { CodaRow } from "../api/rows";
import type { CodaColumn, CodaTable } from "../api/tables";
import { transformCodaDoc } from "../transformers/doc";
import { transformCodaPage } from "../transformers/page";
import { transformCodaRow } from "../transformers/row";
import { transformCodaTable } from "../transformers/table";

const CONTEXT: CodaTransformContext = {
  connectorId: "conn_test_123",
  connectorType: "CODA",
  teamId: "team_abc",
  workspaceId: "ws_xyz",
};

function makeDoc(overrides: Partial<CodaDoc> = {}): CodaDoc {
  return {
    id: "doc_abc123",
    type: "doc",
    href: "https://coda.io/apis/v1/docs/doc_abc123",
    browserLink: "https://coda.io/d/_ddoc_abc123",
    name: "Project Tracker",
    owner: "alice@example.com",
    ownerName: "Alice Johnson",
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-03-20T15:30:00.000Z",
    folder: {
      id: "folder_1",
      type: "folder",
      browserLink: "https://coda.io/d/_ddoc_abc123/folder_1",
      name: "Engineering",
    },
    docSize: {
      totalRowCount: 250,
      tableAndViewCount: 5,
      pageCount: 12,
      overApiSizeLimit: false,
    },
    ...overrides,
  };
}

function makePage(overrides: Partial<CodaPage> = {}): CodaPage {
  return {
    id: "page_xyz",
    type: "page",
    href: "https://coda.io/apis/v1/docs/doc_abc123/pages/page_xyz",
    browserLink: "https://coda.io/d/_ddoc_abc123/_supage_xyz",
    name: "Sprint Planning",
    contentType: "canvas",
    children: [],
    parent: {
      id: "page_root",
      type: "page",
      href: "https://coda.io/apis/v1/docs/doc_abc123/pages/page_root",
      browserLink: "https://coda.io/d/_ddoc_abc123/_supage_root",
      name: "Root",
    },
    createdAt: "2024-01-20T09:00:00.000Z",
    updatedAt: "2024-03-18T14:00:00.000Z",
    ...overrides,
  };
}

function makeTable(overrides: Partial<CodaTable> = {}): CodaTable {
  return {
    id: "grid_tasks",
    type: "table",
    tableType: "table",
    href: "https://coda.io/apis/v1/docs/doc_abc123/tables/grid_tasks",
    browserLink: "https://coda.io/d/_ddoc_abc123/_tbtbl_tasks",
    name: "Tasks",
    parent: {
      id: "page_xyz",
      type: "page",
      href: "https://coda.io/apis/v1/docs/doc_abc123/pages/page_xyz",
      browserLink: "https://coda.io/d/_ddoc_abc123/_supage_xyz",
      name: "Sprint Planning",
    },
    displayColumn: {
      id: "col_name",
      type: "column",
      href: "https://coda.io/apis/v1/docs/doc_abc123/tables/grid_tasks/columns/col_name",
    },
    rowCount: 42,
    sorts: [],
    layout: "default",
    createdAt: "2024-02-01T10:00:00.000Z",
    updatedAt: "2024-03-19T16:00:00.000Z",
    ...overrides,
  };
}

function makeColumns(): CodaColumn[] {
  return [
    {
      id: "col_name",
      type: "column",
      href: "https://coda.io/apis/v1/cols/col_name",
      name: "Task Name",
      display: true,
    },
    {
      id: "col_status",
      type: "column",
      href: "https://coda.io/apis/v1/cols/col_status",
      name: "Status",
    },
    {
      id: "col_assignee",
      type: "column",
      href: "https://coda.io/apis/v1/cols/col_assignee",
      name: "Assignee",
    },
  ];
}

function makeRow(overrides: Partial<CodaRow> = {}): CodaRow {
  return {
    id: "row_001",
    type: "row",
    href: "https://coda.io/apis/v1/docs/doc_abc123/tables/grid_tasks/rows/row_001",
    browserLink: "https://coda.io/d/_ddoc_abc123/_tbtbl_tasks/_rurow_001",
    name: "Fix login bug",
    index: 1,
    createdAt: "2024-02-15T11:00:00.000Z",
    updatedAt: "2024-03-20T09:30:00.000Z",
    values: {
      "Task Name": "Fix login bug",
      Status: "In Progress",
      Assignee: "Bob Smith",
    },
    parent: {
      id: "grid_tasks",
      type: "table",
      href: "https://coda.io/apis/v1/docs/doc_abc123/tables/grid_tasks",
      browserLink: "https://coda.io/d/_ddoc_abc123/_tbtbl_tasks",
      name: "Tasks",
    },
    ...overrides,
  };
}

describe("transformCodaDoc", () => {
  it("transforms a doc with all fields", () => {
    const doc = makeDoc();
    const result = transformCodaDoc(doc, CONTEXT);

    expect(result.id).toBe("conn_test_123_doc_doc_abc123");
    expect(result.document_type).toBe("document");
    expect(result.title).toBe("Project Tracker");
    expect(result.url).toBe("https://coda.io/d/_ddoc_abc123");
    expect(result.author_name).toBe("Alice Johnson");
    expect(result.author_email).toBe("alice@example.com");
    expect(result.connector_id).toBe("conn_test_123");
    expect(result.team_id).toBe("team_abc");
    expect(result.metadata?.folder).toBe("Engineering");
    expect(result.metadata?.pageCount).toBe("12");
    expect(result.metadata?.tableCount).toBe("5");
    expect(result.metadata?.rowCount).toBe("250");
  });

  it("handles doc without docSize", () => {
    const doc = makeDoc({ docSize: undefined });
    const result = transformCodaDoc(doc, CONTEXT);

    expect(result.metadata?.pageCount).toBeUndefined();
    expect(result.metadata?.tableCount).toBeUndefined();
  });

  it("sets correct timestamps", () => {
    const doc = makeDoc();
    const result = transformCodaDoc(doc, CONTEXT);

    expect(result.created_at).toBe(
      new Date("2024-01-15T10:00:00.000Z").getTime()
    );
    expect(result.updated_at).toBe(
      new Date("2024-03-20T15:30:00.000Z").getTime()
    );
  });
});

describe("transformCodaPage", () => {
  it("transforms a page with content", () => {
    const doc = makeDoc();
    const page = makePage();
    const content = "# Sprint Planning\n\nHere are the tasks for this sprint.";
    const result = transformCodaPage(page, doc, CONTEXT, content);

    expect(result.id).toBe("conn_test_123_page_doc_abc123_page_xyz");
    expect(result.document_type).toBe("page");
    expect(result.title).toBe("Sprint Planning");
    expect(result.content).toContain("Sprint Planning");
    expect(result.content).toContain("Here are the tasks");
    expect(result.metadata?.docId).toBe("doc_abc123");
    expect(result.metadata?.docName).toBe("Project Tracker");
    expect(result.metadata?.parentPage).toBe("Root");
  });

  it("handles page without content", () => {
    const doc = makeDoc();
    const page = makePage();
    const result = transformCodaPage(page, doc, CONTEXT);

    expect(result.content).not.toContain("undefined");
    expect(result.document_type).toBe("page");
  });

  it("uses doc timestamps when page timestamps missing", () => {
    const doc = makeDoc();
    const page = makePage({ createdAt: undefined, updatedAt: undefined });
    const result = transformCodaPage(page, doc, CONTEXT);

    expect(result.created_at).toBe(new Date(doc.createdAt).getTime());
    expect(result.updated_at).toBe(new Date(doc.updatedAt).getTime());
  });
});

describe("transformCodaTable", () => {
  it("transforms a table with columns", () => {
    const doc = makeDoc();
    const table = makeTable();
    const columns = makeColumns();
    const result = transformCodaTable(table, doc, columns, CONTEXT);

    expect(result.id).toBe("conn_test_123_table_doc_abc123_grid_tasks");
    expect(result.document_type).toBe("spreadsheet");
    expect(result.title).toBe("Tasks");
    expect(result.content).toContain("Task Name");
    expect(result.content).toContain("Status");
    expect(result.content).toContain("Assignee");
    expect(result.content).toContain("Rows: 42");
    expect(result.metadata?.rowCount).toBe("42");
    expect(result.metadata?.columnCount).toBe("3");
    expect(result.metadata?.docId).toBe("doc_abc123");
  });

  it("stores column names as JSON in metadata", () => {
    const doc = makeDoc();
    const table = makeTable();
    const columns = makeColumns();
    const result = transformCodaTable(table, doc, columns, CONTEXT);

    const parsedColumns = JSON.parse(result.metadata?.columns as string);
    expect(parsedColumns).toEqual(["Task Name", "Status", "Assignee"]);
  });
});

describe("transformCodaRow", () => {
  it("transforms a row with all values", () => {
    const doc = makeDoc();
    const table = makeTable();
    const row = makeRow();
    const result = transformCodaRow(row, table, doc, CONTEXT);

    expect(result.id).toBe("conn_test_123_row_doc_abc123_grid_tasks_row_001");
    expect(result.document_type).toBe("record");
    expect(result.title).toBe("Fix login bug");
    expect(result.content).toContain("Task Name: Fix login bug");
    expect(result.content).toContain("Status: In Progress");
    expect(result.content).toContain("Assignee: Bob Smith");
    expect(result.metadata?.tableId).toBe("grid_tasks");
    expect(result.metadata?.tableName).toBe("Tasks");
    expect(result.metadata?.rowIndex).toBe("1");
  });

  it("uses row index as title when name is empty", () => {
    const doc = makeDoc();
    const table = makeTable();
    const row = makeRow({ name: "", index: 7 });
    const result = transformCodaRow(row, table, doc, CONTEXT);

    expect(result.title).toBe("Row 7");
  });

  it("skips empty values in content", () => {
    const doc = makeDoc();
    const table = makeTable();
    const row = makeRow({
      values: { "Task Name": "Test", Status: "", Notes: null },
    });
    const result = transformCodaRow(row, table, doc, CONTEXT);

    expect(result.content).toContain("Task Name: Test");
    expect(result.content).not.toContain("Status:");
    expect(result.content).not.toContain("Notes:");
  });

  it("sets correct timestamps from row", () => {
    const doc = makeDoc();
    const table = makeTable();
    const row = makeRow();
    const result = transformCodaRow(row, table, doc, CONTEXT);

    expect(result.created_at).toBe(
      new Date("2024-02-15T11:00:00.000Z").getTime()
    );
    expect(result.updated_at).toBe(
      new Date("2024-03-20T09:30:00.000Z").getTime()
    );
  });
});
