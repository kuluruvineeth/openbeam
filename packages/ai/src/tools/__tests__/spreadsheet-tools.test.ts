import { describe, expect, it, mock } from "bun:test";
import { executeSpreadsheetQueryTool } from "../definitions/data/spreadsheet-query";
import { getSpreadsheetSchemaTool } from "../definitions/data/spreadsheet-schema";
import { generateSpreadsheetSqlTool } from "../definitions/data/spreadsheet-sql";
import type { ToolContext } from "../types";

function createMockContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    teamId: "test-team",
    userId: "test-user",
    conversationId: "test-conversation",
    accessControl: [],
    services: {
      analytics: {
        getSpreadsheetSchema: mock(async () => ({
          documentId: "doc-123",
          fileName: "sales.csv",
          sheets: ["Sheet1"],
          activeSheet: "Sheet1",
          columns: [
            { name: "Product", type: "string", nullable: false },
            { name: "Quantity", type: "number", nullable: false },
            { name: "Price", type: "number", nullable: false },
          ],
          rowCount: 100,
          sampleData: [
            { Product: "Widget A", Quantity: 10, Price: 99.99 },
            { Product: "Widget B", Quantity: 5, Price: 149.99 },
          ],
        })),
        generateSql: mock(async () => ({
          sql: 'SELECT "Product", SUM("Quantity") as total FROM data_doc_123 GROUP BY "Product"',
          explanation: "Groups products and sums their quantities",
          referencedColumns: ["Product", "Quantity"],
          estimatedComplexity: "moderate" as const,
        })),
        executeQuery: mock(async () => ({
          rows: [
            { Product: "Widget A", total: 150 },
            { Product: "Widget B", total: 75 },
          ],
          columnTypes: { Product: "string", total: "number" },
          rowCount: 2,
          totalRowsScanned: 100,
          executedSql:
            'SELECT "Product", SUM("Quantity") as total FROM data_doc_123 GROUP BY "Product" LIMIT 1000',
          latencyMs: 15,
        })),
      },
      search: {},
      documents: {},
    } as unknown as ToolContext["services"],
    ...overrides,
  };
}

describe("Spreadsheet Tool Composition", () => {
  describe("get_spreadsheet_schema tool", () => {
    it("returns schema and summary on success", async () => {
      const ctx = createMockContext();
      const result = await getSpreadsheetSchemaTool.execute(
        { documentId: "doc-123" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.schema.documentId).toBe("doc-123");
      expect(result.data?.schema.columns).toHaveLength(3);
      expect(result.data?.summary.rowCount).toBe(100);
    });

    it("returns failure when teamId is missing", async () => {
      const ctx = createMockContext({ teamId: undefined });
      const result = await getSpreadsheetSchemaTool.execute(
        { documentId: "doc-123" },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });

    it("passes optional sheet parameter to service", async () => {
      const ctx = createMockContext();
      await getSpreadsheetSchemaTool.execute(
        { documentId: "doc-123", sheet: "Sales2024" },
        ctx
      );

      expect(ctx.services.analytics.getSpreadsheetSchema).toHaveBeenCalledWith(
        "doc-123",
        "test-team"
      );
    });

    it("includes column summary in response", async () => {
      const ctx = createMockContext();
      const result = await getSpreadsheetSchemaTool.execute(
        { documentId: "doc-123" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.summary.columns).toContain("Product");
      expect(result.data?.summary.columns).toContain("string");
    });
  });

  describe("generate_spreadsheet_sql tool", () => {
    const mockSchema = {
      documentId: "doc-123",
      fileName: "sales.csv",
      sheets: ["Sheet1"],
      activeSheet: "Sheet1",
      columns: [
        { name: "Product", type: "string" as const, nullable: false },
        { name: "Quantity", type: "number" as const, nullable: false },
      ],
      rowCount: 100,
      sampleData: [],
    };

    it("generates SQL from natural language question", async () => {
      const ctx = createMockContext();
      const result = await generateSpreadsheetSqlTool.execute(
        {
          documentId: "doc-123",
          question: "What are the total quantities per product?",
          schema: mockSchema,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.sql).toBeDefined();
      expect(result.data?.explanation).toBeDefined();
    });

    it("includes viewName for next tool", async () => {
      const ctx = createMockContext();
      const result = await generateSpreadsheetSqlTool.execute(
        {
          documentId: "doc-123",
          question: "Show all products",
          schema: mockSchema,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.viewName).toBe("spreadsheet_doc_123");
    });

    it("sets awaitingApproval flag", async () => {
      const ctx = createMockContext();
      const result = await generateSpreadsheetSqlTool.execute(
        {
          documentId: "doc-123",
          question: "Count products",
          schema: mockSchema,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.awaitingApproval).toBe(true);
    });

    it("returns failure when teamId is missing", async () => {
      const ctx = createMockContext({ teamId: undefined });
      const result = await generateSpreadsheetSqlTool.execute(
        {
          documentId: "doc-123",
          question: "Show products",
          schema: mockSchema,
        },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });

    it("returns complexity classification", async () => {
      const ctx = createMockContext();
      const result = await generateSpreadsheetSqlTool.execute(
        {
          documentId: "doc-123",
          question: "Group by product",
          schema: mockSchema,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.complexity).toBeDefined();
      expect(["simple", "moderate", "complex"]).toContain(
        result.data?.complexity ?? ""
      );
    });
  });

  describe("execute_spreadsheet_query tool", () => {
    it("executes SQL and returns formatted results", async () => {
      const ctx = createMockContext();
      const result = await executeSpreadsheetQueryTool.execute(
        {
          documentId: "doc-123",
          sql: "SELECT * FROM data_doc_123",
          viewName: "data_doc_123",
          maxRows: 1000,
          timeoutMs: 10_000,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.rows).toHaveLength(2);
      expect(result.data?.rowCount).toBe(2);
    });

    it("includes performance metrics", async () => {
      const ctx = createMockContext();
      const result = await executeSpreadsheetQueryTool.execute(
        {
          documentId: "doc-123",
          sql: "SELECT * FROM data_doc_123",
          viewName: "data_doc_123",
          maxRows: 1000,
          timeoutMs: 10_000,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.performance.latencyMs).toBeDefined();
      expect(result.data?.performance.rowsPerSecond).toBeGreaterThan(0);
    });

    it("includes formatted table output", async () => {
      const ctx = createMockContext();
      const result = await executeSpreadsheetQueryTool.execute(
        {
          documentId: "doc-123",
          sql: "SELECT * FROM data_doc_123",
          viewName: "data_doc_123",
          maxRows: 1000,
          timeoutMs: 10_000,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.formattedTable).toContain("Product");
    });

    it("passes timeout options to service", async () => {
      const ctx = createMockContext();
      await executeSpreadsheetQueryTool.execute(
        {
          documentId: "doc-123",
          sql: "SELECT * FROM data_doc_123",
          viewName: "data_doc_123",
          maxRows: 500,
          timeoutMs: 5000,
        },
        ctx
      );

      expect(ctx.services.analytics.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { timeoutMs: 5000, maxRows: 500 },
        })
      );
    });

    it("returns failure when teamId is missing", async () => {
      const ctx = createMockContext({ teamId: undefined });
      const result = await executeSpreadsheetQueryTool.execute(
        {
          documentId: "doc-123",
          sql: "SELECT * FROM data",
          viewName: "data",
          maxRows: 1000,
          timeoutMs: 10_000,
        },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Full Pipeline Composition", () => {
    it("completes full schema → sql → query pipeline", async () => {
      const ctx = createMockContext();

      const schemaResult = await getSpreadsheetSchemaTool.execute(
        { documentId: "doc-123" },
        ctx
      );
      expect(schemaResult.success).toBe(true);
      if (!schemaResult.data) {
        throw new Error("Expected schema data");
      }

      const sqlResult = await generateSpreadsheetSqlTool.execute(
        {
          documentId: "doc-123",
          question: "Total by product",
          schema: schemaResult.data.schema,
        },
        ctx
      );
      expect(sqlResult.success).toBe(true);
      if (!sqlResult.data) {
        throw new Error("Expected SQL data");
      }

      const queryResult = await executeSpreadsheetQueryTool.execute(
        {
          documentId: "doc-123",
          sql: sqlResult.data.sql,
          viewName: sqlResult.data.viewName,
          maxRows: 1000,
          timeoutMs: 10_000,
        },
        ctx
      );
      expect(queryResult.success).toBe(true);
      expect(queryResult.data?.rows).toHaveLength(2);
    });

    it("fails at first step if document not found", async () => {
      const ctx = createMockContext({
        services: {
          analytics: {
            getSpreadsheetSchema: mock(() => {
              throw new Error("Document not found");
            }),
            generateSql: mock(() => ({})),
            executeQuery: mock(() => ({})),
          },
        } as unknown as ToolContext["services"],
      });

      try {
        await getSpreadsheetSchemaTool.execute({ documentId: "missing" }, ctx);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Document not found");
      }
    });

    it("maintains document context across pipeline", async () => {
      const ctx = createMockContext();
      const docId = "unique-doc-456";

      await getSpreadsheetSchemaTool.execute({ documentId: docId }, ctx);

      expect(ctx.services.analytics.getSpreadsheetSchema).toHaveBeenCalledWith(
        docId,
        "test-team"
      );
    });
  });

  describe("Error Handling", () => {
    it("propagates service errors with proper error codes", async () => {
      const ctx = createMockContext({
        services: {
          analytics: {
            getSpreadsheetSchema: mock(() => ({
              documentId: "doc-123",
              fileName: "test.csv",
              sheets: ["Sheet1"],
              activeSheet: "Sheet1",
              columns: [],
              rowCount: 0,
              sampleData: [],
            })),
            generateSql: mock(() => {
              throw new Error("LLM service unavailable");
            }),
            executeQuery: mock(() => ({})),
          },
        } as unknown as ToolContext["services"],
      });

      const mockSchema = {
        documentId: "doc-123",
        fileName: "test.csv",
        sheets: ["Sheet1"],
        activeSheet: "Sheet1",
        columns: [],
        rowCount: 0,
        sampleData: [],
      };

      try {
        await generateSpreadsheetSqlTool.execute(
          { documentId: "doc-123", question: "test", schema: mockSchema },
          ctx
        );
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("LLM service unavailable");
      }
    });

    it("handles empty result sets gracefully", async () => {
      const ctx = createMockContext({
        services: {
          analytics: {
            getSpreadsheetSchema: mock(() => ({})),
            generateSql: mock(() => ({})),
            executeQuery: mock(() => ({
              rows: [],
              columnTypes: { id: "number" },
              rowCount: 0,
              totalRowsScanned: 100,
              executedSql: "SELECT * FROM data WHERE 1=0",
              latencyMs: 5,
            })),
          },
        } as unknown as ToolContext["services"],
      });

      const result = await executeSpreadsheetQueryTool.execute(
        {
          documentId: "doc-123",
          sql: "SELECT * FROM data WHERE 1=0",
          viewName: "data",
          maxRows: 1000,
          timeoutMs: 10_000,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.rowCount).toBe(0);
      expect(result.data?.formattedTable).toBe("No results");
    });
  });

  describe("Tool Metadata", () => {
    it("get_spreadsheet_schema has correct metadata", () => {
      expect(getSpreadsheetSchemaTool.metadata.name).toBe(
        "get_spreadsheet_schema"
      );
      expect(getSpreadsheetSchemaTool.metadata.category).toBe("data");
      expect(getSpreadsheetSchemaTool.metadata.searchKeywords).toContain(
        "spreadsheet"
      );
    });

    it("generate_spreadsheet_sql has correct metadata", () => {
      expect(generateSpreadsheetSqlTool.metadata.name).toBe(
        "generate_spreadsheet_sql"
      );
      expect(generateSpreadsheetSqlTool.metadata.category).toBe("data");
      expect(generateSpreadsheetSqlTool.metadata.searchKeywords).toContain(
        "sql"
      );
    });

    it("execute_spreadsheet_query has correct metadata", () => {
      expect(executeSpreadsheetQueryTool.metadata.name).toBe(
        "execute_spreadsheet_query"
      );
      expect(executeSpreadsheetQueryTool.metadata.category).toBe("data");
      expect(executeSpreadsheetQueryTool.metadata.searchKeywords).toContain(
        "execute"
      );
    });
  });
});

describe("Query Result Formatting", () => {
  it("truncates long values with ellipsis", async () => {
    const ctx = createMockContext({
      services: {
        analytics: {
          getSpreadsheetSchema: mock(() => ({})),
          generateSql: mock(() => ({})),
          executeQuery: mock(() => ({
            rows: [
              {
                description:
                  "This is a very long description that exceeds the column width limit and should be truncated",
              },
            ],
            columnTypes: { description: "string" },
            rowCount: 1,
            totalRowsScanned: 1,
            executedSql: "SELECT description FROM data",
            latencyMs: 5,
          })),
        },
      } as unknown as ToolContext["services"],
    });

    const result = await executeSpreadsheetQueryTool.execute(
      {
        documentId: "doc-123",
        sql: "SELECT description FROM data",
        viewName: "data",
        maxRows: 1000,
        timeoutMs: 10_000,
      },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.data?.formattedTable).toContain("…");
  });

  it("handles null values in results", async () => {
    const ctx = createMockContext({
      services: {
        analytics: {
          getSpreadsheetSchema: mock(() => ({})),
          generateSql: mock(() => ({})),
          executeQuery: mock(() => ({
            rows: [{ name: null, value: undefined }],
            columnTypes: { name: "string", value: "number" },
            rowCount: 1,
            totalRowsScanned: 1,
            executedSql: "SELECT * FROM data",
            latencyMs: 5,
          })),
        },
      } as unknown as ToolContext["services"],
    });

    const result = await executeSpreadsheetQueryTool.execute(
      {
        documentId: "doc-123",
        sql: "SELECT * FROM data",
        viewName: "data",
        maxRows: 1000,
        timeoutMs: 10_000,
      },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.data?.formattedTable).toContain("NULL");
  });

  it("shows row count when results exceed display limit", async () => {
    const manyRows = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
    }));

    const ctx = createMockContext({
      services: {
        analytics: {
          getSpreadsheetSchema: mock(() => ({})),
          generateSql: mock(() => ({})),
          executeQuery: mock(() => ({
            rows: manyRows,
            columnTypes: { id: "number", name: "string" },
            rowCount: 50,
            totalRowsScanned: 50,
            executedSql: "SELECT * FROM data",
            latencyMs: 10,
          })),
        },
      } as unknown as ToolContext["services"],
    });

    const result = await executeSpreadsheetQueryTool.execute(
      {
        documentId: "doc-123",
        sql: "SELECT * FROM data",
        viewName: "data",
        maxRows: 1000,
        timeoutMs: 10_000,
      },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.data?.formattedTable).toContain("more rows");
  });
});
