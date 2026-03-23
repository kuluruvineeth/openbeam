import { describe, expect, it } from "bun:test";
import type { AirtableTransformContext } from "@openbeam/types/services/connectors/airtable";
import { transformAirtableComment } from "../transformers/comment";
import { transformAirtableRecord } from "../transformers/record";
import { transformAirtableTable } from "../transformers/table";
import { fieldValueToString } from "../transformers/utils";

const context: AirtableTransformContext = {
  connectorId: "conn_test",
  connectorType: "AIRTABLE",
  teamId: "team_test",
  workspaceId: "ws_test",
};

describe("transformAirtableRecord", () => {
  it("transforms a record with text fields", () => {
    const record = {
      id: "rec123",
      createdTime: "2024-01-15T10:00:00.000Z",
      fields: {
        Name: "Acme Corp",
        Status: "Active",
        Revenue: 50_000,
      },
    };

    const result = transformAirtableRecord(record, context, {
      baseId: "appABC",
      baseName: "CRM",
      tableId: "tblXYZ",
      tableName: "Companies",
    });

    expect(result.id).toBe("conn_test_record_rec123");
    expect(result.document_type).toBe("record");
    expect(result.document_subtype).toBe("Companies");
    expect(result.title).toBe("Acme Corp");
    expect(result.content).toContain("Name: Acme Corp");
    expect(result.content).toContain("Status: Active");
    expect(result.content).toContain("Revenue: 50000");
    expect(result.url).toBe("https://airtable.com/appABC/tblXYZ/rec123");
    expect(result.connector_id).toBe("conn_test");
    expect(result.team_id).toBe("team_test");
    expect(result.external_id).toBe("rec123");
    expect(result.metadata?.baseId).toBe("appABC");
    expect(result.metadata?.baseName).toBe("CRM");
    expect(result.metadata?.tableId).toBe("tblXYZ");
    expect(result.metadata?.tableName).toBe("Companies");
  });

  it("handles empty fields", () => {
    const record = {
      id: "rec456",
      createdTime: "2024-01-15T10:00:00.000Z",
      fields: {},
    };

    const result = transformAirtableRecord(record, context, {
      baseId: "appABC",
      baseName: "CRM",
      tableId: "tblXYZ",
      tableName: "Companies",
    });

    expect(result.title).toBe("Record rec456");
    expect(result.content).toBe("");
  });

  it("handles linked records and arrays", () => {
    const record = {
      id: "rec789",
      createdTime: "2024-02-01T12:00:00.000Z",
      fields: {
        Tags: ["urgent", "review"],
        Assignee: { id: "usr1", name: "Alice", email: "alice@test.com" },
      },
    };

    const result = transformAirtableRecord(record, context, {
      baseId: "appABC",
      baseName: "Tasks",
      tableId: "tblTSK",
      tableName: "Tasks",
    });

    expect(result.content).toContain("Tags: urgent, review");
    expect(result.content).toContain("Assignee: Alice");
  });
});

describe("transformAirtableTable", () => {
  it("transforms a table with fields and views", () => {
    const table = {
      id: "tblXYZ",
      name: "Companies",
      description: "All company records",
      primaryFieldId: "fldName",
      fields: [
        { id: "fldName", name: "Name", type: "singleLineText" },
        {
          id: "fldRev",
          name: "Revenue",
          type: "number",
          description: "Annual revenue",
        },
        { id: "fldStat", name: "Status", type: "singleSelect" },
      ],
      views: [
        { id: "viwAll", name: "All Companies", type: "grid" },
        { id: "viwActive", name: "Active Only", type: "grid" },
      ],
    };

    const result = transformAirtableTable(table, context, {
      baseId: "appABC",
      baseName: "CRM",
    });

    expect(result.id).toBe("conn_test_table_tblXYZ");
    expect(result.document_type).toBe("spreadsheet");
    expect(result.document_subtype).toBe("table");
    expect(result.title).toBe("Companies — CRM");
    expect(result.content).toContain("All company records");
    expect(result.content).toContain("Name (singleLineText)");
    expect(result.content).toContain("Revenue (number) — Annual revenue");
    expect(result.content).toContain("All Companies (grid)");
    expect(result.url).toBe("https://airtable.com/appABC/tblXYZ");
    expect(result.metadata?.fieldCount).toBe("3");
    expect(result.metadata?.viewCount).toBe("2");
  });
});

describe("transformAirtableComment", () => {
  it("transforms a record comment", () => {
    const comment = {
      id: "com123",
      text: "This looks good, approved for next phase.",
      author: { id: "usr1", email: "alice@test.com", name: "Alice" },
      createdTime: "2024-03-01T14:30:00.000Z",
      lastUpdatedTime: "2024-03-01T15:00:00.000Z",
    };

    const result = transformAirtableComment(comment, context, {
      baseId: "appABC",
      baseName: "CRM",
      tableId: "tblXYZ",
      tableName: "Companies",
      recordId: "rec123",
    });

    expect(result.id).toBe("conn_test_comment_com123");
    expect(result.document_type).toBe("comment");
    expect(result.document_subtype).toBe("record_comment");
    expect(result.title).toBe("This looks good, approved for next phase.");
    expect(result.content).toBe("This looks good, approved for next phase.");
    expect(result.author_name).toBe("Alice");
    expect(result.author_email).toBe("alice@test.com");
    expect(result.author_id).toBe("usr1");
    expect(result.url).toBe("https://airtable.com/appABC/tblXYZ/rec123");
    expect(result.metadata?.recordId).toBe("rec123");
    expect(result.metadata?.tableName).toBe("Companies");
  });

  it("truncates long comment text in title", () => {
    const longText = "A".repeat(120);
    const comment = {
      id: "com456",
      text: longText,
      author: { id: "usr2", email: "bob@test.com", name: "Bob" },
      createdTime: "2024-03-01T14:30:00.000Z",
    };

    const result = transformAirtableComment(comment, context, {
      baseId: "appABC",
      baseName: "CRM",
      tableId: "tblXYZ",
      tableName: "Companies",
      recordId: "rec123",
    });

    expect(result.title.length).toBeLessThanOrEqual(83);
    expect(result.title).toEndWith("...");
    expect(result.content).toBe(longText);
  });
});

describe("fieldValueToString", () => {
  it("converts primitive types", () => {
    expect(fieldValueToString("hello")).toBe("hello");
    expect(fieldValueToString(42)).toBe("42");
    expect(fieldValueToString(true)).toBe("true");
    expect(fieldValueToString(null)).toBe("");
    expect(fieldValueToString(undefined)).toBe("");
  });

  it("converts arrays", () => {
    expect(fieldValueToString(["a", "b", "c"])).toBe("a, b, c");
    expect(fieldValueToString([{ name: "Alice" }, { name: "Bob" }])).toBe(
      "Alice, Bob"
    );
  });

  it("extracts name from objects", () => {
    expect(fieldValueToString({ name: "Acme" })).toBe("Acme");
    expect(fieldValueToString({ url: "https://example.com" })).toBe(
      "https://example.com"
    );
    expect(fieldValueToString({ email: "test@test.com" })).toBe(
      "test@test.com"
    );
  });
});
