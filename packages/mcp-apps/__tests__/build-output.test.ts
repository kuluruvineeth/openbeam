import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIST = join(import.meta.dir, "../dist/views");
const EXTERNAL_SCRIPT_RE = /<script[^>]+src=/;
const EXTERNAL_CSS_RE = /<link[^>]+href=["'][^"']*\.css/;

describe("build output", () => {
  if (!existsSync(DIST)) {
    it("dist directory exists", () => {
      expect(existsSync(DIST)).toBe(true);
    });
    return;
  }

  const files = readdirSync(DIST).filter((f) => f.endsWith(".html"));

  it("has at least one built app", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    describe(file, () => {
      const html = readFileSync(join(DIST, file), "utf-8");

      it("contains valid HTML structure", () => {
        expect(html).toContain("<html");
        expect(html).toContain("</html>");
        expect(html).toContain('<div id="root">');
      });

      it("has no external scripts", () => {
        expect(html).not.toMatch(EXTERNAL_SCRIPT_RE);
      });

      it("has no external stylesheets", () => {
        expect(html).not.toMatch(EXTERNAL_CSS_RE);
      });

      it("is not empty", () => {
        expect(html.length).toBeGreaterThan(1000);
      });

      it("is under 2MB", () => {
        expect(html.length).toBeLessThan(2 * 1024 * 1024);
      });
    });
  }
});
