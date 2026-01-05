import { describe, expect, it } from "bun:test";
import {
  createStructuredChunks,
  extractStructure,
} from "../structure-extractor";
import type { DocumentElement } from "../types";

function createTestElement(
  type: string,
  text: string,
  metadata?: Record<string, unknown>
): DocumentElement {
  return { type, text, metadata };
}

describe("extractStructure", () => {
  describe("outline building", () => {
    it("builds outline from Title elements", () => {
      const elements: DocumentElement[] = [
        createTestElement("Title", "Document Title"),
        createTestElement("NarrativeText", "Some content here."),
      ];

      const structure = extractStructure(elements);

      expect(structure.hasToc).toBe(true);
      expect(structure.outline).toHaveLength(1);
      expect(structure.outline[0]?.title).toBe("Document Title");
      expect(structure.outline[0]?.level).toBe(1);
    });

    it("builds outline from Header elements", () => {
      const elements: DocumentElement[] = [
        createTestElement("Header", "Chapter 1"),
        createTestElement("NarrativeText", "Chapter content."),
        createTestElement("Header", "Chapter 2"),
        createTestElement("NarrativeText", "More content."),
      ];

      const structure = extractStructure(elements);

      expect(structure.hasToc).toBe(true);
      expect(structure.outline).toHaveLength(2);
      expect(structure.outline[0]?.title).toBe("Chapter 1");
      expect(structure.outline[1]?.title).toBe("Chapter 2");
    });

    it("handles hierarchical structure with nested sections", () => {
      const elements: DocumentElement[] = [
        createTestElement("Title", "Main Title"),
        createTestElement("Header", "1. Introduction", { level: 2 }),
        createTestElement("NarrativeText", "Intro content."),
        createTestElement("Header", "1.1 Background", { level: 3 }),
        createTestElement("NarrativeText", "Background info."),
        createTestElement("Header", "2. Methods", { level: 2 }),
        createTestElement("NarrativeText", "Methods content."),
      ];

      const structure = extractStructure(elements);

      expect(structure.outline).toHaveLength(1);
      expect(structure.outline[0]?.children).toHaveLength(2);
      expect(structure.outline[0]?.children[0]?.title).toBe("1. Introduction");
      expect(structure.outline[0]?.children[0]?.children).toHaveLength(1);
      expect(structure.outline[0]?.children[0]?.children[0]?.title).toBe(
        "1.1 Background"
      );
    });

    it("returns empty outline for documents without headings", () => {
      const elements: DocumentElement[] = [
        createTestElement("NarrativeText", "Just some text."),
        createTestElement("ListItem", "Item 1"),
        createTestElement("ListItem", "Item 2"),
      ];

      const structure = extractStructure(elements);

      expect(structure.hasToc).toBe(false);
      expect(structure.outline).toHaveLength(0);
      expect(structure.totalSections).toBe(0);
    });
  });

  describe("heading level inference", () => {
    it("treats Title elements as level 1", () => {
      const elements: DocumentElement[] = [
        createTestElement("Title", "Main Title"),
      ];

      const structure = extractStructure(elements);

      expect(structure.outline[0]?.level).toBe(1);
    });

    it("uses metadata.level when available", () => {
      const elements: DocumentElement[] = [
        createTestElement("Header", "Section", { level: 3 }),
      ];

      const structure = extractStructure(elements);

      expect(structure.outline[0]?.level).toBe(3);
    });

    it("infers level 2 from numbered sections like 1.", () => {
      const elements: DocumentElement[] = [
        createTestElement("Header", "1. Introduction"),
      ];

      const structure = extractStructure(elements);

      expect(structure.outline[0]?.level).toBe(2);
    });

    it("infers level 2 from numbered sections like 1.1", () => {
      const elements: DocumentElement[] = [
        createTestElement("Header", "1.1 Background"),
      ];

      const structure = extractStructure(elements);

      expect(structure.outline[0]?.level).toBe(2);
    });

    it("infers level 3 from numbered sections like 1.1.1", () => {
      const elements: DocumentElement[] = [
        createTestElement("Header", "1.1.1 Details"),
      ];

      const structure = extractStructure(elements);

      expect(structure.outline[0]?.level).toBe(3);
    });

    it("treats ALL CAPS short text as level 1", () => {
      const elements: DocumentElement[] = [
        createTestElement("Header", "INTRODUCTION"),
      ];

      const structure = extractStructure(elements);

      expect(structure.outline[0]?.level).toBe(1);
    });

    it("does not treat long ALL CAPS as level 1", () => {
      const elements: DocumentElement[] = [
        createTestElement(
          "Header",
          "THIS IS A VERY LONG ALL CAPS HEADING THAT EXCEEDS FIFTY CHARACTERS"
        ),
      ];

      const structure = extractStructure(elements);

      expect(structure.outline[0]?.level).toBe(2);
    });

    it("defaults to level 2 for regular headers", () => {
      const elements: DocumentElement[] = [
        createTestElement("Header", "Regular Section"),
      ];

      const structure = extractStructure(elements);

      expect(structure.outline[0]?.level).toBe(2);
    });
  });

  describe("structure metrics", () => {
    it("counts total sections correctly", () => {
      const elements: DocumentElement[] = [
        createTestElement("Title", "Title"),
        createTestElement("Header", "Section 1"),
        createTestElement("Header", "Section 2"),
        createTestElement("Header", "Section 3"),
      ];

      const structure = extractStructure(elements);

      expect(structure.totalSections).toBe(4);
    });

    it("counts nested sections in total", () => {
      const elements: DocumentElement[] = [
        createTestElement("Title", "Main"),
        createTestElement("Header", "1. First", { level: 2 }),
        createTestElement("Header", "1.1 Sub", { level: 3 }),
        createTestElement("Header", "2. Second", { level: 2 }),
      ];

      const structure = extractStructure(elements);

      expect(structure.totalSections).toBe(4);
    });

    it("calculates max depth correctly", () => {
      const elements: DocumentElement[] = [
        createTestElement("Title", "Main"),
        createTestElement("Header", "1.", { level: 2 }),
        createTestElement("Header", "1.1", { level: 3 }),
        createTestElement("Header", "1.1.1", { level: 4 }),
      ];

      const structure = extractStructure(elements);

      expect(structure.maxDepth).toBe(4);
    });

    it("returns maxDepth 0 for no outline", () => {
      const elements: DocumentElement[] = [
        createTestElement("NarrativeText", "Just text."),
      ];

      const structure = extractStructure(elements);

      expect(structure.maxDepth).toBe(0);
    });

    it("generates consistent outline hash", () => {
      const elements: DocumentElement[] = [
        createTestElement("Title", "Title"),
        createTestElement("Header", "Section 1"),
      ];

      const structure1 = extractStructure(elements);
      const structure2 = extractStructure(elements);

      expect(structure1.outlineHash).toBe(structure2.outlineHash);
      expect(structure1.outlineHash).toHaveLength(16);
    });

    it("generates different hash for different outlines", () => {
      const elements1: DocumentElement[] = [
        createTestElement("Title", "Title A"),
      ];
      const elements2: DocumentElement[] = [
        createTestElement("Title", "Title B"),
      ];

      const structure1 = extractStructure(elements1);
      const structure2 = extractStructure(elements2);

      expect(structure1.outlineHash).not.toBe(structure2.outlineHash);
    });
  });

  describe("page number extraction", () => {
    it("extracts pageStart from element metadata", () => {
      const elements: DocumentElement[] = [
        createTestElement("Title", "Page 5 Title", { page_number: 5 }),
      ];

      const structure = extractStructure(elements);

      expect(structure.outline[0]?.pageStart).toBe(5);
    });

    it("handles pageNumber variant in metadata", () => {
      const elements: DocumentElement[] = [
        createTestElement("Title", "Title", { pageNumber: 3 }),
      ];

      const structure = extractStructure(elements);

      expect(structure.outline[0]?.pageStart).toBe(3);
    });

    it("handles page variant in metadata", () => {
      const elements: DocumentElement[] = [
        createTestElement("Title", "Title", { page: 7 }),
      ];

      const structure = extractStructure(elements);

      expect(structure.outline[0]?.pageStart).toBe(7);
    });
  });
});

describe("createStructuredChunks", () => {
  describe("basic chunking", () => {
    it("creates single chunk for small content", () => {
      const elements: DocumentElement[] = [
        createTestElement("Title", "Title"),
        createTestElement("NarrativeText", "Short content."),
      ];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]?.text).toContain("Short content");
    });

    it("assigns sequential indices to chunks", () => {
      const elements: DocumentElement[] = [
        createTestElement("Header", "Section 1"),
        createTestElement("NarrativeText", "Content 1"),
        createTestElement("Header", "Section 2"),
        createTestElement("NarrativeText", "Content 2"),
      ];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure);

      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i]?.index).toBe(i);
      }
    });

    it("handles empty elements array", () => {
      const elements: DocumentElement[] = [];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.text).toBe("");
    });
  });

  describe("section context preservation", () => {
    it("assigns sectionTitle to chunks", () => {
      const elements: DocumentElement[] = [
        createTestElement("Header", "Introduction"),
        createTestElement("NarrativeText", "This is the intro content."),
      ];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure);

      const contentChunk = chunks.find((c) => c.text.includes("intro content"));
      expect(contentChunk?.sectionTitle).toBe("Introduction");
    });

    it("assigns sectionId to chunks", () => {
      const elements: DocumentElement[] = [
        createTestElement("Header", "Methods"),
        createTestElement("NarrativeText", "Method description."),
      ];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure);

      expect(chunks.every((c) => c.sectionId !== undefined)).toBe(true);
    });

    it("builds correct sectionPath for nested sections", () => {
      const elements: DocumentElement[] = [
        createTestElement("Title", "Document"),
        createTestElement("Header", "1. Chapter", { level: 2 }),
        createTestElement("Header", "1.1 Section", { level: 3 }),
        createTestElement("NarrativeText", "Deep content."),
      ];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure);

      const deepChunk = chunks.find((c) => c.text.includes("Deep content"));
      expect(deepChunk?.sectionPath).toContain("Document");
      expect(deepChunk?.sectionPath).toContain("1. Chapter");
      expect(deepChunk?.sectionPath).toContain("1.1 Section");
    });

    it("assigns sectionLevel correctly", () => {
      const elements: DocumentElement[] = [
        createTestElement("Header", "1.1.1 Deep Section", { level: 4 }),
        createTestElement("NarrativeText", "Deep text."),
      ];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure);

      expect(chunks[0]?.sectionLevel).toBe(4);
    });
  });

  describe("element type tracking", () => {
    it("tracks element types in chunk", () => {
      const elements: DocumentElement[] = [
        createTestElement("Header", "Section"),
        createTestElement("NarrativeText", "Text."),
        createTestElement("ListItem", "Item 1"),
        createTestElement("Table", "| A | B |"),
      ];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure);

      const elementTypes = chunks.flatMap((c) => c.elementTypes);
      expect(elementTypes).toContain("Header");
      expect(elementTypes).toContain("NarrativeText");
      expect(elementTypes).toContain("ListItem");
      expect(elementTypes).toContain("Table");
    });

    it("deduplicates element types within a chunk", () => {
      const elements: DocumentElement[] = [
        createTestElement("NarrativeText", "First paragraph."),
        createTestElement("NarrativeText", "Second paragraph."),
        createTestElement("NarrativeText", "Third paragraph."),
      ];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure);

      const narrativeCount = chunks[0]?.elementTypes.filter(
        (t) => t === "NarrativeText"
      ).length;
      expect(narrativeCount).toBe(1);
    });
  });

  describe("page number handling", () => {
    it("assigns pageNumber from element metadata", () => {
      const elements: DocumentElement[] = [
        createTestElement("NarrativeText", "Page 5 content.", {
          page_number: 5,
        }),
      ];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure);

      expect(chunks[0]?.pageNumber).toBe(5);
    });

    it("assigns pageEnd for multi-page sections", () => {
      const elements: DocumentElement[] = [
        createTestElement("Header", "Long Section", { page_number: 10 }),
        createTestElement("NarrativeText", "Start.", { page_number: 10 }),
        createTestElement("NarrativeText", "Middle.", { page_number: 11 }),
        createTestElement("NarrativeText", "End.", { page_number: 12 }),
      ];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure);

      expect(chunks[0]?.pageNumber).toBe(10);
      expect(chunks[0]?.pageEnd).toBe(12);
    });
  });

  describe("chunk size control", () => {
    it("respects maxChunkSize option", () => {
      const longText = "A".repeat(5000);
      const elements: DocumentElement[] = [
        createTestElement("NarrativeText", longText),
      ];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure, {
        maxChunkSize: 1000,
      });

      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.text.length).toBeLessThanOrEqual(1100);
      }
    });

    it("does not split small sections", () => {
      const elements: DocumentElement[] = [
        createTestElement("Header", "Small Section"),
        createTestElement("NarrativeText", "Short content."),
      ];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure, {
        maxChunkSize: 1500,
      });

      expect(chunks).toHaveLength(1);
    });

    it("preserves section context when splitting large sections", () => {
      const longText = "Sentence. ".repeat(200);
      const elements: DocumentElement[] = [
        createTestElement("Header", "Important Section"),
        createTestElement("NarrativeText", longText),
      ];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure, {
        maxChunkSize: 500,
      });

      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.sectionTitle).toBe("Important Section");
      }
    });
  });

  describe("documents without structure", () => {
    it("creates chunks for documents without headings", () => {
      const elements: DocumentElement[] = [
        createTestElement("NarrativeText", "First paragraph."),
        createTestElement("NarrativeText", "Second paragraph."),
      ];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]?.sectionId).toBeUndefined();
      expect(chunks[0]?.sectionTitle).toBeUndefined();
      expect(chunks[0]?.sectionPath).toHaveLength(0);
    });
  });

  describe("boundary splitting", () => {
    it("prefers paragraph boundaries when splitting", () => {
      const text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
      const elements: DocumentElement[] = [
        createTestElement("NarrativeText", text),
      ];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure, {
        maxChunkSize: 40,
      });

      expect(chunks.length).toBeGreaterThan(1);
    });

    it("falls back to sentence boundaries", () => {
      const text =
        "First sentence. Second sentence. Third sentence. Fourth sentence.";
      const elements: DocumentElement[] = [
        createTestElement("NarrativeText", text),
      ];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure, {
        maxChunkSize: 50,
      });

      expect(chunks.length).toBeGreaterThan(1);
    });
  });

  describe("edge cases", () => {
    it("handles very long titles by truncating", () => {
      const longTitle = "A".repeat(300);
      const elements: DocumentElement[] = [
        createTestElement("Title", longTitle),
      ];

      const structure = extractStructure(elements);

      expect(structure.outline[0]?.title.length).toBeLessThanOrEqual(200);
    });

    it("handles mixed content types", () => {
      const elements: DocumentElement[] = [
        createTestElement("Title", "Report"),
        createTestElement("NarrativeText", "Introduction text."),
        createTestElement("ListItem", "• Point 1"),
        createTestElement("ListItem", "• Point 2"),
        createTestElement("Table", "| Col1 | Col2 |"),
        createTestElement("FigureCaption", "Figure 1: Description"),
      ];

      const structure = extractStructure(elements);
      const chunks = createStructuredChunks(elements, structure);

      expect(chunks.length).toBeGreaterThan(0);
      expect(structure.outline).toHaveLength(1);
    });

    it("handles sibling sections at same level", () => {
      const elements: DocumentElement[] = [
        createTestElement("Header", "Section A", { level: 2 }),
        createTestElement("NarrativeText", "A content."),
        createTestElement("Header", "Section B", { level: 2 }),
        createTestElement("NarrativeText", "B content."),
        createTestElement("Header", "Section C", { level: 2 }),
        createTestElement("NarrativeText", "C content."),
      ];

      const structure = extractStructure(elements);

      expect(structure.outline).toHaveLength(3);
      expect(structure.outline[0]?.title).toBe("Section A");
      expect(structure.outline[1]?.title).toBe("Section B");
      expect(structure.outline[2]?.title).toBe("Section C");
    });
  });
});
