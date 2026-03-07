import { describe, expect, it } from "bun:test";
import type { InputNodeConfig } from "@openbeam/types/canvas";
import {
  normalizeInputValues,
  resolveNodeConfig,
} from "../input-normalization";

const baseConfig = (fields: InputNodeConfig["fields"]): InputNodeConfig => ({
  prompt: "",
  fields,
  submitLabel: "Submit",
  allowSkip: false,
  skipLabel: "Skip",
  timeoutAction: "skip",
});

describe("normalizeInputValues", () => {
  it("flags missing required fields", () => {
    const config = baseConfig([
      {
        id: "name",
        type: "text",
        label: "Name",
        validation: { required: true },
        width: "full",
      },
    ]);

    const result = normalizeInputValues(config, {});

    expect(result.errors).toContain("Missing required field: name");
  });

  it("normalizes number and boolean values", () => {
    const config = baseConfig([
      {
        id: "count",
        type: "number",
        label: "Count",
        width: "full",
      },
      {
        id: "active",
        type: "boolean",
        label: "Active",
        width: "full",
      },
    ]);

    const result = normalizeInputValues(config, {
      count: "12",
      active: "true",
    });

    expect(result.values.count).toBe(12);
    expect(result.values.active).toBe(true);
  });

  it("validates select options", () => {
    const config = baseConfig([
      {
        id: "choice",
        type: "select",
        label: "Choice",
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
        width: "full",
      },
    ]);

    const result = normalizeInputValues(config, { choice: "c" });

    expect(result.errors).toContain("Field choice has invalid option");
  });

  it("uses default values for blank input", () => {
    const config = baseConfig([
      {
        id: "note",
        type: "text",
        label: "Note",
        defaultValue: "ready",
        width: "full",
      },
    ]);

    const result = normalizeInputValues(config, { note: "" });

    expect(result.values.note).toBe("ready");
  });

  it("flags unknown fields", () => {
    const config = baseConfig([]);
    const result = normalizeInputValues(config, { extra: "value" });

    expect(result.errors).toContain("Unknown field: extra");
  });
});

describe("URL protocol validation", () => {
  const urlField = (id = "website") =>
    baseConfig([{ id, type: "url", label: "Website", width: "full" as const }]);

  it("accepts http URLs", () => {
    const result = normalizeInputValues(urlField(), {
      website: "http://example.com/path",
    });
    expect(result.errors).toHaveLength(0);
    expect(result.values.website).toBe("http://example.com/path");
  });

  it("accepts https URLs", () => {
    const result = normalizeInputValues(urlField(), {
      website: "https://example.com/secure",
    });
    expect(result.errors).toHaveLength(0);
    expect(result.values.website).toBe("https://example.com/secure");
  });

  it("rejects javascript: protocol (XSS prevention)", () => {
    const result = normalizeInputValues(urlField(), {
      website: "javascript:alert('xss')",
    });
    expect(result.errors).toContain(
      "Field website must use http or https protocol"
    );
    expect(result.values.website).toBeUndefined();
  });

  it("rejects data: protocol (XSS prevention)", () => {
    const result = normalizeInputValues(urlField(), {
      website: "data:text/html,<script>alert('xss')</script>",
    });
    expect(result.errors).toContain(
      "Field website must use http or https protocol"
    );
    expect(result.values.website).toBeUndefined();
  });

  it("rejects file: protocol (SSRF prevention)", () => {
    const result = normalizeInputValues(urlField(), {
      website: "file:///etc/passwd",
    });
    expect(result.errors).toContain(
      "Field website must use http or https protocol"
    );
    expect(result.values.website).toBeUndefined();
  });

  it("rejects ftp: protocol", () => {
    const result = normalizeInputValues(urlField(), {
      website: "ftp://files.example.com/file.txt",
    });
    expect(result.errors).toContain(
      "Field website must use http or https protocol"
    );
    expect(result.values.website).toBeUndefined();
  });

  it("rejects invalid URL format", () => {
    const result = normalizeInputValues(urlField(), {
      website: "not-a-valid-url",
    });
    expect(result.errors).toContain("Field website must be a URL");
    expect(result.values.website).toBeUndefined();
  });
});

describe("Regex ReDoS protection", () => {
  const patternField = (pattern: string) =>
    baseConfig([
      {
        id: "value",
        type: "text",
        label: "Value",
        width: "full" as const,
        validation: { required: false, pattern },
      },
    ]);

  it("accepts safe regex patterns", () => {
    const result = normalizeInputValues(patternField("^[a-z]+$"), {
      value: "hello",
    });
    expect(result.errors).toHaveLength(0);
    expect(result.values.value).toBe("hello");
  });

  it("rejects nested quantifiers (ReDoS prevention)", () => {
    const result = normalizeInputValues(patternField("(a+)+"), {
      value: "aaaaaaaaaaaaaaaaab",
    });
    expect(result.errors).toContain("Field value has unsafe pattern");
  });

  it("rejects (a*)*  pattern", () => {
    const result = normalizeInputValues(patternField("(a*)*"), {
      value: "test",
    });
    expect(result.errors).toContain("Field value has unsafe pattern");
  });

  it("rejects (a+)* pattern", () => {
    const result = normalizeInputValues(patternField("(a+)*"), {
      value: "test",
    });
    expect(result.errors).toContain("Field value has unsafe pattern");
  });

  it("rejects (a?)+ pattern", () => {
    const result = normalizeInputValues(patternField("(a?)+"), {
      value: "test",
    });
    expect(result.errors).toContain("Field value has unsafe pattern");
  });

  it("reports invalid regex syntax", () => {
    const result = normalizeInputValues(patternField("[invalid"), {
      value: "test",
    });
    expect(result.errors).toContain("Field value has invalid pattern");
  });

  it("validates pattern correctly for matching input", () => {
    const result = normalizeInputValues(patternField("^\\d{3}-\\d{4}$"), {
      value: "123-4567",
    });
    expect(result.errors).toHaveLength(0);
  });

  it("reports invalid input for non-matching pattern", () => {
    const result = normalizeInputValues(patternField("^\\d+$"), {
      value: "abc",
    });
    expect(result.errors).toContain("Field value is invalid");
  });
});

describe("resolveNodeConfig", () => {
  it("returns config when present", () => {
    const config = baseConfig([]);
    const nodeData = { config };

    expect(resolveNodeConfig(nodeData)).toEqual(config);
  });
});
