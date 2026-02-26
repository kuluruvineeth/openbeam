import { describe, expect, it } from "bun:test";

function escapeCSVFieldImpl(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

describe("escapeCSVField", () => {
  const escapeCSVField = escapeCSVFieldImpl;

  it("returns plain values unchanged", () => {
    expect(escapeCSVField("hello")).toBe("hello");
    expect(escapeCSVField("12345")).toBe("12345");
  });

  it("wraps values with commas in quotes", () => {
    expect(escapeCSVField("hello, world")).toBe('"hello, world"');
  });

  it("escapes double quotes", () => {
    expect(escapeCSVField('he said "hi"')).toBe('"he said ""hi"""');
  });

  it("wraps values with newlines in quotes", () => {
    expect(escapeCSVField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("handles combined special characters", () => {
    expect(escapeCSVField('a "b", c\nd')).toBe('"a ""b"", c\nd"');
  });
});

describe("buildSelectSQL", () => {
  function buildSelectSQL(
    config: { fields?: string[]; filter?: string; limit?: number },
    objectName: string
  ): string {
    const columns = config.fields?.length
      ? config.fields.map((f) => `"${f.replace(/"/g, '""')}"`).join(", ")
      : "*";

    let sql = `SELECT ${columns} FROM v_${objectName}`;

    if (config.filter) {
      sql += ` WHERE ${config.filter}`;
    }

    if (config.limit) {
      sql += ` LIMIT ${config.limit}`;
    }

    return sql;
  }

  it("selects all columns by default", () => {
    const sql = buildSelectSQL({}, "leads");
    expect(sql).toBe("SELECT * FROM v_leads");
  });

  it("selects specific columns", () => {
    const sql = buildSelectSQL({ fields: ["name", "email"] }, "contacts");
    expect(sql).toBe('SELECT "name", "email" FROM v_contacts');
  });

  it("applies filter", () => {
    const sql = buildSelectSQL({ filter: "status = 'active'" }, "leads");
    expect(sql).toBe("SELECT * FROM v_leads WHERE status = 'active'");
  });

  it("applies limit", () => {
    const sql = buildSelectSQL({ limit: 100 }, "leads");
    expect(sql).toBe("SELECT * FROM v_leads LIMIT 100");
  });

  it("combines filter and limit", () => {
    const sql = buildSelectSQL(
      { filter: "revenue > 1000", limit: 50 },
      "deals"
    );
    expect(sql).toBe("SELECT * FROM v_deals WHERE revenue > 1000 LIMIT 50");
  });

  it("escapes quotes in field names", () => {
    const sql = buildSelectSQL({ fields: ['field"name'] }, "test");
    expect(sql).toBe('SELECT "field""name" FROM v_test');
  });
});
