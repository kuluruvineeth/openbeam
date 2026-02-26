import { describe, expect, it } from "bun:test";
import { generatePivotViewSQL } from "../duckdb/views";

describe("generatePivotViewSQL", () => {
  it("generates view with no fields", () => {
    const sql = generatePivotViewSQL("leads", "obj_1", []);

    expect(sql).toContain("CREATE OR REPLACE VIEW v_leads");
    expect(sql).toContain("e.id AS entry_id");
    expect(sql).toContain("e.created_at");
    expect(sql).toContain("e.updated_at");
    expect(sql).toContain("WHERE e.object_id = 'obj_1'");
    expect(sql).not.toContain("MAX(CASE");
  });

  it("generates pivot columns for fields", () => {
    const fields = [
      { id: "f1", name: "company_name", type: "text" },
      { id: "f2", name: "revenue", type: "number" },
    ];
    const sql = generatePivotViewSQL("leads", "obj_1", fields);

    expect(sql).toContain("CREATE OR REPLACE VIEW v_leads");
    expect(sql).toContain(
      "MAX(CASE WHEN f.id = 'f1' THEN ef.value END) AS \"company_name\""
    );
    expect(sql).toContain(
      "MAX(CASE WHEN f.id = 'f2' THEN ef.value END) AS \"revenue\""
    );
    expect(sql).toContain("GROUP BY e.id, e.created_at, e.updated_at");
  });

  it("escapes field names with quotes", () => {
    const fields = [{ id: "f1", name: 'field"name', type: "text" }];
    const sql = generatePivotViewSQL("test", "obj_1", fields);

    expect(sql).toContain('"field""name"');
  });

  it("joins entries, entry_fields, and fields tables", () => {
    const fields = [{ id: "f1", name: "name", type: "text" }];
    const sql = generatePivotViewSQL("contacts", "obj_1", fields);

    expect(sql).toContain("FROM entries e");
    expect(sql).toContain("LEFT JOIN entry_fields ef ON ef.entry_id = e.id");
    expect(sql).toContain("LEFT JOIN fields f ON f.id = ef.field_id");
  });

  it("filters by object_id", () => {
    const fields = [{ id: "f1", name: "name", type: "text" }];
    const sql = generatePivotViewSQL("tasks", "obj_xyz", fields);

    expect(sql).toContain("WHERE e.object_id = 'obj_xyz'");
  });
});
