import { describe, expect, it } from "bun:test";
import { WorkspaceDuckDBError } from "../duckdb/client";
import {
  buildParameterizedQuery,
  escapeSqlValue,
  isReadOnlyQuery,
  validateQuerySafety,
} from "../duckdb/query";

describe("isReadOnlyQuery", () => {
  it("accepts SELECT statements", () => {
    expect(isReadOnlyQuery("SELECT * FROM users")).toBe(true);
    expect(isReadOnlyQuery("  select id from users")).toBe(true);
  });

  it("accepts PRAGMA statements", () => {
    expect(isReadOnlyQuery("PRAGMA table_info('users')")).toBe(true);
  });

  it("accepts DESCRIBE statements", () => {
    expect(isReadOnlyQuery("DESCRIBE users")).toBe(true);
  });

  it("accepts SHOW statements", () => {
    expect(isReadOnlyQuery("SHOW TABLES")).toBe(true);
  });

  it("accepts EXPLAIN statements", () => {
    expect(isReadOnlyQuery("EXPLAIN SELECT * FROM users")).toBe(true);
  });

  it("accepts WITH (CTE) statements", () => {
    expect(isReadOnlyQuery("WITH cte AS (SELECT 1) SELECT * FROM cte")).toBe(
      true
    );
  });

  it("rejects INSERT statements", () => {
    expect(isReadOnlyQuery("INSERT INTO users VALUES (1)")).toBe(false);
  });

  it("rejects UPDATE statements", () => {
    expect(isReadOnlyQuery("UPDATE users SET name = 'test'")).toBe(false);
  });

  it("rejects DELETE statements", () => {
    expect(isReadOnlyQuery("DELETE FROM users")).toBe(false);
  });

  it("rejects DROP statements", () => {
    expect(isReadOnlyQuery("DROP TABLE users")).toBe(false);
  });

  it("rejects CREATE statements", () => {
    expect(isReadOnlyQuery("CREATE TABLE users (id INT)")).toBe(false);
  });
});

describe("validateQuerySafety", () => {
  it("allows any query in non-read-only mode", () => {
    expect(() =>
      validateQuerySafety("INSERT INTO users VALUES (1)", false)
    ).not.toThrow();
    expect(() => validateQuerySafety("DROP TABLE users", false)).not.toThrow();
  });

  it("allows read-only queries in read-only mode", () => {
    expect(() =>
      validateQuerySafety("SELECT * FROM users", true)
    ).not.toThrow();
    expect(() =>
      validateQuerySafety("EXPLAIN SELECT * FROM users", true)
    ).not.toThrow();
  });

  it("rejects non-read-only queries in read-only mode", () => {
    expect(() =>
      validateQuerySafety("INSERT INTO users VALUES (1)", true)
    ).toThrow(WorkspaceDuckDBError);
  });

  it("detects dangerous keywords in subqueries", () => {
    expect(() =>
      validateQuerySafety("SELECT * FROM (DELETE FROM users)", true)
    ).toThrow(WorkspaceDuckDBError);
  });

  it("allows EXPLAIN with dangerous-looking subexpressions", () => {
    expect(() =>
      validateQuerySafety("EXPLAIN INSERT INTO users VALUES (1)", true)
    ).not.toThrow();
  });
});

describe("escapeSqlValue", () => {
  it("returns NULL for null", () => {
    expect(escapeSqlValue(null)).toBe("NULL");
  });

  it("returns NULL for undefined", () => {
    expect(escapeSqlValue(undefined)).toBe("NULL");
  });

  it("returns number as string", () => {
    expect(escapeSqlValue(42)).toBe("42");
    expect(escapeSqlValue(3.14)).toBe("3.14");
  });

  it("returns boolean as lowercase string", () => {
    expect(escapeSqlValue(true)).toBe("true");
    expect(escapeSqlValue(false)).toBe("false");
  });

  it("escapes single quotes in strings", () => {
    expect(escapeSqlValue("hello")).toBe("'hello'");
    expect(escapeSqlValue("it's")).toBe("'it''s'");
    expect(escapeSqlValue("a'b'c")).toBe("'a''b''c'");
  });
});

describe("buildParameterizedQuery", () => {
  it("replaces named parameters", () => {
    const result = buildParameterizedQuery(
      "SELECT * FROM users WHERE name = :name AND age = :age",
      { name: "John", age: 30 }
    );
    expect(result).toBe("SELECT * FROM users WHERE name = 'John' AND age = 30");
  });

  it("handles null parameters", () => {
    const result = buildParameterizedQuery(
      "SELECT * FROM users WHERE name = :name",
      { name: null }
    );
    expect(result).toBe("SELECT * FROM users WHERE name = NULL");
  });

  it("throws for missing parameters", () => {
    expect(() =>
      buildParameterizedQuery("SELECT * FROM users WHERE id = :id", {})
    ).toThrow(WorkspaceDuckDBError);
  });

  it("escapes string values", () => {
    const result = buildParameterizedQuery(
      "SELECT * FROM users WHERE name = :name",
      { name: "O'Brien" }
    );
    expect(result).toBe("SELECT * FROM users WHERE name = 'O''Brien'");
  });
});
