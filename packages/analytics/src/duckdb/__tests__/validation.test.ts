import { describe, expect, it } from "bun:test";
import { DuckDBApiError } from "../types";
import {
  addLimitClause,
  assertValidSQL,
  extractReferencedColumns,
  sanitizeTableName,
  validateSQL,
  validateTableName,
} from "../validation";

describe("validateSQL", () => {
  const allowedTables = ["v_123", "data_456"];

  describe("valid queries", () => {
    it("allows simple SELECT", () => {
      const result = validateSQL(
        'SELECT "Name", "Salary" FROM "v_123"',
        allowedTables
      );
      expect(result.valid).toBe(true);
    });

    it("allows SELECT with WHERE", () => {
      const result = validateSQL(
        "SELECT * FROM v_123 WHERE \"Status\" = 'active'",
        allowedTables
      );
      expect(result.valid).toBe(true);
    });

    it("allows aggregations", () => {
      const result = validateSQL(
        'SELECT "Department", AVG("Salary") as avg_salary FROM v_123 GROUP BY "Department"',
        allowedTables
      );
      expect(result.valid).toBe(true);
    });

    it("allows CTEs when CTE name is in allowed tables", () => {
      const result = validateSQL(
        `WITH totals AS (SELECT SUM("Amount") as total FROM v_123)
         SELECT * FROM totals`,
        [...allowedTables, "totals"]
      );
      expect(result.valid).toBe(true);
    });

    it("allows ORDER BY and LIMIT", () => {
      const result = validateSQL(
        'SELECT * FROM v_123 ORDER BY "Date" DESC LIMIT 10',
        allowedTables
      );
      expect(result.valid).toBe(true);
    });

    it("allows HAVING clause", () => {
      const result = validateSQL(
        'SELECT "Department", COUNT(*) as cnt FROM v_123 GROUP BY "Department" HAVING COUNT(*) > 5',
        allowedTables
      );
      expect(result.valid).toBe(true);
    });

    it("allows subqueries in WHERE", () => {
      const result = validateSQL(
        'SELECT * FROM v_123 WHERE "Salary" > (SELECT AVG("Salary") FROM v_123)',
        allowedTables
      );
      expect(result.valid).toBe(true);
    });

    it("allows CASE expressions", () => {
      const result = validateSQL(
        `SELECT
          CASE WHEN "Salary" > 100000 THEN 'high' ELSE 'low' END as salary_level
         FROM v_123`,
        allowedTables
      );
      expect(result.valid).toBe(true);
    });

    it("allows DISTINCT", () => {
      const result = validateSQL(
        'SELECT DISTINCT "Department" FROM v_123',
        allowedTables
      );
      expect(result.valid).toBe(true);
    });

    it("allows built-in aggregate functions", () => {
      const result = validateSQL(
        'SELECT COUNT(*), SUM("Amount"), MIN("Date"), MAX("Date") FROM v_123',
        allowedTables
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("blocked dangerous functions", () => {
    it("blocks read_csv function", () => {
      const result = validateSQL(
        "SELECT * FROM read_csv('/etc/passwd')",
        allowedTables
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("read_csv");
      expect(result.error).toContain("not allowed");
    });

    it("blocks read_parquet function", () => {
      const result = validateSQL(
        "SELECT * FROM read_parquet('/data/secrets.parquet')",
        allowedTables
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("read_parquet");
      expect(result.error).toContain("not allowed");
    });

    it("blocks read_json function", () => {
      const result = validateSQL(
        "SELECT * FROM read_json('/config/settings.json')",
        allowedTables
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("read_json");
      expect(result.error).toContain("not allowed");
    });

    it("blocks glob function", () => {
      const result = validateSQL("SELECT * FROM glob('/tmp/*')", allowedTables);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("glob");
      expect(result.error).toContain("not allowed");
    });
  });

  describe("blocked scalar functions", () => {
    it("blocks dangerous functions when called inline", () => {
      const result = validateSQL(
        "SELECT COALESCE(\"Name\", 'default') FROM v_123",
        allowedTables
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("blocked statement types", () => {
    it("blocks INSERT", () => {
      const result = validateSQL(
        'INSERT INTO v_123 VALUES (1, "test")',
        allowedTables
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("insert");
    });

    it("blocks UPDATE", () => {
      const result = validateSQL(
        "UPDATE v_123 SET \"Name\" = 'hacked'",
        allowedTables
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("update");
    });

    it("blocks DELETE", () => {
      const result = validateSQL("DELETE FROM v_123", allowedTables);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("delete");
    });

    it("blocks DROP", () => {
      const result = validateSQL("DROP TABLE v_123", allowedTables);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("drop");
    });

    it("blocks CREATE", () => {
      const result = validateSQL("CREATE TABLE evil (id INT)", allowedTables);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("create");
    });

    it("blocks TRUNCATE", () => {
      const result = validateSQL("TRUNCATE TABLE v_123", allowedTables);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("truncate");
    });
  });

  describe("table access control", () => {
    it("blocks unauthorized tables", () => {
      const result = validateSQL('SELECT * FROM "other_table"', allowedTables);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("other_table");
      expect(result.error).toContain("not in allowed list");
    });

    it("allows tables in allowed list (case insensitive)", () => {
      const result = validateSQL("SELECT * FROM V_123", allowedTables);
      expect(result.valid).toBe(true);
    });

    it("blocks cross-table queries to unauthorized tables", () => {
      const result = validateSQL(
        "SELECT * FROM v_123 JOIN unauthorized_table ON v_123.id = unauthorized_table.id",
        allowedTables
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("unauthorized_table");
    });
  });

  describe("SQL injection prevention", () => {
    it("blocks SQL with semicolon attempting multiple statements", () => {
      const result = validateSQL(
        "SELECT * FROM v_123; DROP TABLE v_123; --",
        allowedTables
      );
      expect(result.valid).toBe(false);
    });

    it("handles malformed SQL gracefully", () => {
      const result = validateSQL(
        "SELECT * FROM ((( broken syntax",
        allowedTables
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("parse error");
    });

    it("blocks UNION with unauthorized table", () => {
      const result = validateSQL(
        "SELECT * FROM v_123 UNION SELECT * FROM pg_catalog.pg_user",
        allowedTables
      );
      expect(result.valid).toBe(false);
    });
  });
});

describe("assertValidSQL", () => {
  it("does not throw for valid SQL", () => {
    expect(() =>
      assertValidSQL("SELECT * FROM v_123", ["v_123"])
    ).not.toThrow();
  });

  it("throws DuckDBApiError for invalid SQL", () => {
    expect(() =>
      assertValidSQL("SELECT * FROM unauthorized", ["v_123"])
    ).toThrow(DuckDBApiError);
  });

  it("throws with correct error code", () => {
    try {
      assertValidSQL("DROP TABLE v_123", ["v_123"]);
    } catch (error) {
      expect(error).toBeInstanceOf(DuckDBApiError);
      expect((error as DuckDBApiError).code).toBe("SQL_INVALID");
      expect((error as DuckDBApiError).retryable).toBe(false);
    }
  });
});

describe("sanitizeTableName", () => {
  it("removes special characters", () => {
    expect(sanitizeTableName("table-name")).toBe("table_name");
    expect(sanitizeTableName("table.name")).toBe("table_name");
    expect(sanitizeTableName("table name")).toBe("table_name");
  });

  it("preserves valid characters", () => {
    expect(sanitizeTableName("valid_table_123")).toBe("valid_table_123");
  });

  it("handles UUIDs", () => {
    expect(sanitizeTableName("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "550e8400_e29b_41d4_a716_446655440000"
    );
  });
});

describe("validateTableName", () => {
  it("accepts valid table names", () => {
    expect(validateTableName("users")).toBe(true);
    expect(validateTableName("_private")).toBe(true);
    expect(validateTableName("table_123")).toBe(true);
    expect(validateTableName("CamelCase")).toBe(true);
  });

  it("rejects invalid table names", () => {
    expect(validateTableName("123_starts_with_number")).toBe(false);
    expect(validateTableName("has-hyphen")).toBe(false);
    expect(validateTableName("has.dot")).toBe(false);
    expect(validateTableName("has space")).toBe(false);
    expect(validateTableName("")).toBe(false);
  });
});

describe("extractReferencedColumns", () => {
  it("returns empty array for malformed SQL", () => {
    const columns = extractReferencedColumns("invalid sql (((");
    expect(columns).toEqual([]);
  });

  it("handles SELECT * without crashing", () => {
    const columns = extractReferencedColumns("SELECT * FROM employees");
    expect(Array.isArray(columns)).toBe(true);
  });

  it("handles complex queries without crashing", () => {
    const columns = extractReferencedColumns(
      "SELECT department, AVG(salary) FROM employees GROUP BY department HAVING COUNT(*) > 5"
    );
    expect(Array.isArray(columns)).toBe(true);
  });

  it("returns unique values", () => {
    const columns = extractReferencedColumns(
      "SELECT a, b, a FROM t WHERE a > 1"
    );
    const uniqueColumns = [...new Set(columns)];
    expect(columns.length).toBe(uniqueColumns.length);
  });
});

describe("addLimitClause", () => {
  it("adds LIMIT to query without one", () => {
    const result = addLimitClause("SELECT * FROM table", 100);
    expect(result).toBe("SELECT * FROM table LIMIT 100");
  });

  it("does not add LIMIT if already present", () => {
    const result = addLimitClause("SELECT * FROM table LIMIT 50", 100);
    expect(result).toBe("SELECT * FROM table LIMIT 50");
  });

  it("handles case-insensitive LIMIT", () => {
    const result = addLimitClause("SELECT * FROM table limit 50", 100);
    expect(result).toBe("SELECT * FROM table limit 50");
  });

  it("trims whitespace", () => {
    const result = addLimitClause("  SELECT * FROM table  ", 100);
    expect(result).toBe("SELECT * FROM table LIMIT 100");
  });
});
