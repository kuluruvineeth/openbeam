import { describe, expect, it, mock } from "bun:test";
import {
  type AnalyticsServiceDeps,
  createAnalyticsService,
  type DocumentInfo,
  type SpreadsheetSchema,
} from "../service";
import { DuckDBApiError } from "../types";

function createMockDeps(
  overrides?: Partial<AnalyticsServiceDeps>
): AnalyticsServiceDeps {
  return {
    downloadFile: mock(async () => Buffer.from("Name,Value\nTest,123")),
    getDocument: mock(
      async (documentId: string): Promise<DocumentInfo | null> => ({
        id: documentId,
        fileName: "test.csv",
        storageKey: "test-storage-key",
        mimeType: "text/csv",
        teamId: "test-team",
      })
    ),
    generateSqlWithLLM: mock(async ({ query, viewName }) => ({
      sql: `SELECT * FROM "${viewName}" LIMIT 10`,
      explanation: `Query to answer: ${query}`,
    })),
    ...overrides,
  };
}

describe("createAnalyticsService", () => {
  describe("getSpreadsheetSchema - authorization checks", () => {
    it("calls getDocument with correct documentId", async () => {
      const deps = createMockDeps();
      const service = createAnalyticsService(deps);

      try {
        await service.getSpreadsheetSchema("doc-123", "test-team");
      } catch {
        // DuckDB init will fail, but we can check deps were called
      }

      expect(deps.getDocument).toHaveBeenCalledWith("doc-123");
    });

    it("throws DuckDBApiError when document not found", async () => {
      const deps = createMockDeps({
        getDocument: mock(async () => null),
      });
      const service = createAnalyticsService(deps);

      await expect(
        service.getSpreadsheetSchema("missing-doc", "test-team")
      ).rejects.toThrow(DuckDBApiError);
    });

    it("throws when team ID does not match document", async () => {
      const deps = createMockDeps({
        getDocument: mock(async (id) => ({
          id,
          fileName: "test.csv",
          storageKey: "key",
          mimeType: "text/csv",
          teamId: "team-a",
        })),
      });
      const service = createAnalyticsService(deps);

      await expect(
        service.getSpreadsheetSchema("doc-123", "team-b")
      ).rejects.toThrow("Unauthorized");
    });

    it("throws with correct error structure for missing document", async () => {
      const deps = createMockDeps({
        getDocument: mock(async () => null),
      });
      const service = createAnalyticsService(deps);

      try {
        await service.getSpreadsheetSchema("missing", "test-team");
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(DuckDBApiError);
        expect((error as DuckDBApiError).message).toContain(
          "Document not found"
        );
      }
    });
  });

  describe("generateSql", () => {
    it("calls LLM with correct parameters", async () => {
      const deps = createMockDeps();
      const service = createAnalyticsService(deps);
      const schema: SpreadsheetSchema = {
        documentId: "doc-123",
        fileName: "test.csv",
        sheets: ["Sheet1"],
        activeSheet: "Sheet1",
        columns: [{ name: "Name", type: "string", nullable: false }],
        rowCount: 100,
        sampleData: [],
      };

      await service.generateSql({
        documentId: "doc-123",
        naturalLanguageQuery: "Show all data",
        schema,
      });

      expect(deps.generateSqlWithLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "Show all data",
          schema,
          viewName: "data_doc_123",
        })
      );
    });

    it("returns SQL and explanation from LLM", async () => {
      const deps = createMockDeps({
        generateSqlWithLLM: mock(async () => ({
          sql: "SELECT name FROM data_doc_123",
          explanation: "Gets all names",
        })),
      });
      const service = createAnalyticsService(deps);
      const schema: SpreadsheetSchema = {
        documentId: "doc-123",
        fileName: "test.csv",
        sheets: ["Sheet1"],
        activeSheet: "Sheet1",
        columns: [],
        rowCount: 100,
        sampleData: [],
      };

      const result = await service.generateSql({
        documentId: "doc-123",
        naturalLanguageQuery: "Show names",
        schema,
      });

      expect(result.sql).toBe("SELECT name FROM data_doc_123");
      expect(result.explanation).toBe("Gets all names");
    });

    it("classifies simple queries correctly", async () => {
      const deps = createMockDeps({
        generateSqlWithLLM: mock(async () => ({
          sql: "SELECT * FROM data LIMIT 10",
          explanation: "Simple select",
        })),
      });
      const service = createAnalyticsService(deps);
      const schema: SpreadsheetSchema = {
        documentId: "doc-123",
        fileName: "test.csv",
        sheets: ["Sheet1"],
        activeSheet: "Sheet1",
        columns: [],
        rowCount: 100,
        sampleData: [],
      };

      const result = await service.generateSql({
        documentId: "doc-123",
        naturalLanguageQuery: "Show all",
        schema,
      });

      expect(result.estimatedComplexity).toBe("simple");
    });

    it("classifies GROUP BY queries as moderate", async () => {
      const deps = createMockDeps({
        generateSqlWithLLM: mock(async () => ({
          sql: "SELECT department, COUNT(*) FROM data GROUP BY department",
          explanation: "Grouped count",
        })),
      });
      const service = createAnalyticsService(deps);
      const schema: SpreadsheetSchema = {
        documentId: "doc-123",
        fileName: "test.csv",
        sheets: ["Sheet1"],
        activeSheet: "Sheet1",
        columns: [],
        rowCount: 100,
        sampleData: [],
      };

      const result = await service.generateSql({
        documentId: "doc-123",
        naturalLanguageQuery: "Count by department",
        schema,
      });

      expect(result.estimatedComplexity).toBe("moderate");
    });

    it("classifies ORDER BY queries as moderate", async () => {
      const deps = createMockDeps({
        generateSqlWithLLM: mock(async () => ({
          sql: "SELECT * FROM data ORDER BY created_at DESC",
          explanation: "Ordered results",
        })),
      });
      const service = createAnalyticsService(deps);
      const schema: SpreadsheetSchema = {
        documentId: "doc-123",
        fileName: "test.csv",
        sheets: ["Sheet1"],
        activeSheet: "Sheet1",
        columns: [],
        rowCount: 100,
        sampleData: [],
      };

      const result = await service.generateSql({
        documentId: "doc-123",
        naturalLanguageQuery: "Sort by date",
        schema,
      });

      expect(result.estimatedComplexity).toBe("moderate");
    });

    it("classifies JOIN queries as complex", async () => {
      const deps = createMockDeps({
        generateSqlWithLLM: mock(async () => ({
          sql: "SELECT * FROM a JOIN b ON a.id = b.id",
          explanation: "Joined tables",
        })),
      });
      const service = createAnalyticsService(deps);
      const schema: SpreadsheetSchema = {
        documentId: "doc-123",
        fileName: "test.csv",
        sheets: ["Sheet1"],
        activeSheet: "Sheet1",
        columns: [],
        rowCount: 100,
        sampleData: [],
      };

      const result = await service.generateSql({
        documentId: "doc-123",
        naturalLanguageQuery: "Join tables",
        schema,
      });

      expect(result.estimatedComplexity).toBe("complex");
    });

    it("classifies subqueries as complex", async () => {
      const deps = createMockDeps({
        generateSqlWithLLM: mock(async () => ({
          sql: "SELECT * FROM data WHERE id IN (SELECT id FROM other)",
          explanation: "Subquery",
        })),
      });
      const service = createAnalyticsService(deps);
      const schema: SpreadsheetSchema = {
        documentId: "doc-123",
        fileName: "test.csv",
        sheets: ["Sheet1"],
        activeSheet: "Sheet1",
        columns: [],
        rowCount: 100,
        sampleData: [],
      };

      const result = await service.generateSql({
        documentId: "doc-123",
        naturalLanguageQuery: "Find matching",
        schema,
      });

      expect(result.estimatedComplexity).toBe("complex");
    });

    it("creates viewName from documentId by replacing hyphens", async () => {
      const deps = createMockDeps();
      const service = createAnalyticsService(deps);
      const schema: SpreadsheetSchema = {
        documentId: "a1b2-c3d4-e5f6",
        fileName: "test.csv",
        sheets: ["Sheet1"],
        activeSheet: "Sheet1",
        columns: [],
        rowCount: 100,
        sampleData: [],
      };

      await service.generateSql({
        documentId: "a1b2-c3d4-e5f6",
        naturalLanguageQuery: "Query",
        schema,
      });

      expect(deps.generateSqlWithLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          viewName: "data_a1b2_c3d4_e5f6",
        })
      );
    });
  });

  describe("executeQuery - precondition checks", () => {
    it("throws when spreadsheet not loaded", async () => {
      const deps = createMockDeps();
      const service = createAnalyticsService(deps);

      await expect(
        service.executeQuery({
          documentId: "unloaded-doc",
          sql: "SELECT * FROM data",
          viewName: "data",
        })
      ).rejects.toThrow("Spreadsheet not loaded");
    });

    it("provides helpful error message for unloaded spreadsheet", async () => {
      const deps = createMockDeps();
      const service = createAnalyticsService(deps);

      try {
        await service.executeQuery({
          documentId: "unloaded",
          sql: "SELECT * FROM data",
          viewName: "data",
        });
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(DuckDBApiError);
        expect((error as DuckDBApiError).message).toContain(
          "getSpreadsheetSchema"
        );
      }
    });
  });

  describe("cleanup", () => {
    it("handles cleanup of non-existent document without error", async () => {
      const deps = createMockDeps();
      const service = createAnalyticsService(deps);

      await expect(service.cleanup("non-existent")).resolves.toBeUndefined();
    });
  });

  describe("cleanupAll", () => {
    it("handles empty cache without error", async () => {
      const deps = createMockDeps();
      const service = createAnalyticsService(deps);

      await expect(service.cleanupAll()).resolves.toBeUndefined();
    });
  });
});

describe("file type detection", () => {
  it("rejects unsupported file types", async () => {
    const deps = createMockDeps({
      getDocument: mock(async (id) => ({
        id,
        fileName: "data.txt",
        storageKey: "key",
        mimeType: "text/plain",
        teamId: "test-team",
      })),
    });
    const service = createAnalyticsService(deps);

    await expect(
      service.getSpreadsheetSchema("doc-txt", "test-team")
    ).rejects.toThrow("Unsupported file type");
  });

  it("rejects unknown mime types", async () => {
    const deps = createMockDeps({
      getDocument: mock(async (id) => ({
        id,
        fileName: "data.xyz",
        storageKey: "key",
        mimeType: "application/octet-stream",
        teamId: "test-team",
      })),
    });
    const service = createAnalyticsService(deps);

    await expect(
      service.getSpreadsheetSchema("doc-xyz", "test-team")
    ).rejects.toThrow("Unsupported file type");
  });
});

describe("AnalyticsServiceDeps interface", () => {
  it("allows custom downloadFile implementation", async () => {
    const customDownload = mock(async () => Buffer.from("custom,data"));
    const deps = createMockDeps({ downloadFile: customDownload });
    const service = createAnalyticsService(deps);

    try {
      await service.getSpreadsheetSchema("doc-1", "test-team");
    } catch {
      // Will fail at DuckDB, but downloadFile should be called
    }

    expect(customDownload).toHaveBeenCalledWith("test-storage-key");
  });

  it("allows custom getDocument implementation", async () => {
    const customGetDoc = mock(async () => ({
      id: "custom-id",
      fileName: "custom.csv",
      storageKey: "custom-key",
      mimeType: "text/csv",
      teamId: "custom-team",
    }));
    const deps = createMockDeps({ getDocument: customGetDoc });
    const service = createAnalyticsService(deps);

    await expect(
      service.getSpreadsheetSchema("doc-1", "custom-team")
    ).rejects.toThrow(); // Will fail at DuckDB

    expect(customGetDoc).toHaveBeenCalledWith("doc-1");
  });
});
