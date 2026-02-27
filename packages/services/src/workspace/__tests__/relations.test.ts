import { describe, expect, it } from "bun:test";
import { parseRelationValue } from "../objects/relations";

describe("parseRelationValue", () => {
  it("returns empty array for empty string", () => {
    expect(parseRelationValue("")).toEqual([]);
  });

  it("returns single ID for simple value", () => {
    expect(parseRelationValue("entry_abc")).toEqual(["entry_abc"]);
  });

  it("parses JSON array of IDs", () => {
    expect(parseRelationValue('["id1","id2","id3"]')).toEqual([
      "id1",
      "id2",
      "id3",
    ]);
  });

  it("parses comma-separated IDs", () => {
    expect(parseRelationValue("id1, id2, id3")).toEqual(["id1", "id2", "id3"]);
  });

  it("trims whitespace", () => {
    expect(parseRelationValue("  id1  ")).toEqual(["id1"]);
  });

  it("filters empty values from comma-separated", () => {
    expect(parseRelationValue("id1,,id2")).toEqual(["id1", "id2"]);
  });

  it("handles JSON array with single element", () => {
    expect(parseRelationValue('["only_one"]')).toEqual(["only_one"]);
  });

  it("converts non-string JSON array elements to strings", () => {
    expect(parseRelationValue("[1,2,3]")).toEqual(["1", "2", "3"]);
  });
});
