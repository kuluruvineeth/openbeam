import { createHash } from "node:crypto";
import type {
  DocumentStructure,
  OutlineNode,
  StructuredChunk,
} from "./structure";
import type { DocumentElement } from "./types";

const HEADING_TYPES = new Set(["Title", "Header"]);

const NUMBERED_SECTION_PATTERN = /^(\d+(?:\.\d+)*)\s+/;
const ALL_CAPS_PATTERN = /^[A-Z\s]+$/;
const MAX_TITLE_LENGTH = 200;
const DEFAULT_MAX_CHUNK_SIZE = 1500;
const DEFAULT_OVERLAP = 150;
const PARAGRAPH_BREAK = "\n\n";
const SENTENCE_END_PATTERN = /[.!?]\s+/;

interface ElementWithPosition extends DocumentElement {
  position: number;
  pageNumber?: number;
}

interface SectionGroup {
  section: OutlineNode | null;
  elements: ElementWithPosition[];
  pageStart?: number;
  pageEnd?: number;
}

interface ChunkOptions {
  maxChunkSize?: number;
  overlap?: number;
}

export function extractStructure(
  elements: DocumentElement[]
): DocumentStructure {
  const enriched = enrichElementsWithPosition(elements);
  const outline = buildOutline(enriched);
  const outlineHash = hashOutline(outline);

  return {
    hasToc: outline.length > 0,
    outline,
    totalSections: countSections(outline),
    maxDepth: calculateMaxDepth(outline),
    outlineHash,
  };
}

export function createStructuredChunks(
  elements: DocumentElement[],
  structure: DocumentStructure,
  options: ChunkOptions = {}
): StructuredChunk[] {
  const { maxChunkSize = DEFAULT_MAX_CHUNK_SIZE, overlap = DEFAULT_OVERLAP } =
    options;

  const enriched = enrichElementsWithPosition(elements);
  const sectionGroups = groupElementsBySection(enriched, structure.outline);

  const chunks: StructuredChunk[] = [];
  let chunkIndex = 0;

  for (const group of sectionGroups) {
    const sectionText = group.elements.map((e) => e.text).join(PARAGRAPH_BREAK);
    const sectionPath = buildSectionPath(group.section, structure.outline);
    const elementTypes = [...new Set(group.elements.map((e) => e.type))];

    if (sectionText.length <= maxChunkSize) {
      chunks.push({
        index: chunkIndex,
        text: sectionText,
        pageNumber: group.pageStart,
        pageEnd: group.pageEnd,
        sectionId: group.section?.id,
        sectionTitle: group.section?.title,
        sectionPath,
        sectionLevel: group.section?.level,
        elementTypes,
      });
      chunkIndex += 1;
    } else {
      const subChunks = splitAtBoundaries(sectionText, maxChunkSize, overlap);
      for (const subChunk of subChunks) {
        chunks.push({
          index: chunkIndex,
          text: subChunk,
          pageNumber: group.pageStart,
          pageEnd: group.pageEnd,
          sectionId: group.section?.id,
          sectionTitle: group.section?.title,
          sectionPath,
          sectionLevel: group.section?.level,
          elementTypes,
        });
        chunkIndex += 1;
      }
    }
  }

  return chunks;
}

function enrichElementsWithPosition(
  elements: DocumentElement[]
): ElementWithPosition[] {
  let position = 0;
  return elements.map((el) => {
    const enriched: ElementWithPosition = {
      ...el,
      position,
      pageNumber: extractPageNumber(el.metadata),
    };
    position += el.text.length + 1;
    return enriched;
  });
}

function extractPageNumber(
  metadata: Record<string, unknown> | undefined
): number | undefined {
  if (!metadata) {
    return;
  }
  const page = metadata.page_number ?? metadata.pageNumber ?? metadata.page;
  return typeof page === "number" ? page : undefined;
}

function buildOutline(elements: ElementWithPosition[]): OutlineNode[] {
  const outline: OutlineNode[] = [];
  const stack: { node: OutlineNode; level: number }[] = [];

  for (const element of elements) {
    if (!HEADING_TYPES.has(element.type)) {
      continue;
    }

    const level = inferHeadingLevel(element);
    const node: OutlineNode = {
      id: `section-${element.position}`,
      title: element.text.slice(0, MAX_TITLE_LENGTH),
      level,
      pageStart: element.pageNumber,
      charStart: element.position,
      children: [],
    };

    while (stack.length > 0 && (stack.at(-1)?.level ?? 0) >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      outline.push(node);
    } else {
      stack.at(-1)?.node.children.push(node);
    }

    stack.push({ node, level });
  }

  return outline;
}

function inferHeadingLevel(element: DocumentElement): number {
  if (element.type === "Title") {
    return 1;
  }

  const meta = element.metadata;
  if (meta?.level && typeof meta.level === "number") {
    return meta.level;
  }

  const text = element.text;
  const numberedMatch = text.match(NUMBERED_SECTION_PATTERN);
  if (numberedMatch) {
    const dotCount = (numberedMatch[1]?.match(/\./g) || []).length;
    return Math.min(dotCount + 1, 6);
  }

  if (ALL_CAPS_PATTERN.test(text) && text.length < 50) {
    return 1;
  }

  return 2;
}

function groupElementsBySection(
  elements: ElementWithPosition[],
  outline: OutlineNode[]
): SectionGroup[] {
  if (outline.length === 0) {
    return [
      {
        section: null,
        elements,
        pageStart: elements[0]?.pageNumber,
        pageEnd: elements.at(-1)?.pageNumber,
      },
    ];
  }

  const flatSections = flattenOutline(outline);
  const groups: SectionGroup[] = [];
  let currentGroup: SectionGroup | null = null;

  for (const element of elements) {
    const section = findContainingSection(element.position, flatSections);

    if (!currentGroup || currentGroup.section?.id !== section?.id) {
      if (currentGroup && currentGroup.elements.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = {
        section,
        elements: [],
        pageStart: element.pageNumber,
      };
    }

    currentGroup.elements.push(element);
    currentGroup.pageEnd = element.pageNumber;
  }

  if (currentGroup && currentGroup.elements.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

function flattenOutline(outline: OutlineNode[]): OutlineNode[] {
  const result: OutlineNode[] = [];
  for (const node of outline) {
    result.push(node);
    result.push(...flattenOutline(node.children));
  }
  return result;
}

function findContainingSection(
  position: number,
  sections: OutlineNode[]
): OutlineNode | null {
  let containing: OutlineNode | null = null;

  for (const section of sections) {
    if (
      section.charStart !== undefined &&
      section.charStart <= position &&
      (!containing || section.charStart > (containing.charStart ?? -1))
    ) {
      containing = section;
    }
  }

  return containing;
}

function buildSectionPath(
  section: OutlineNode | null,
  outline: OutlineNode[]
): string[] {
  if (!section) {
    return [];
  }

  const path: string[] = [];
  findPathToSection(section.id, outline, path);
  return path;
}

function findPathToSection(
  targetId: string,
  nodes: OutlineNode[],
  path: string[]
): boolean {
  for (const node of nodes) {
    if (node.id === targetId) {
      path.push(node.title);
      return true;
    }
    if (node.children.length > 0) {
      path.push(node.title);
      if (findPathToSection(targetId, node.children, path)) {
        return true;
      }
      path.pop();
    }
  }
  return false;
}

function splitAtBoundaries(
  text: string,
  maxSize: number,
  overlap: number
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);

    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf(PARAGRAPH_BREAK, end);
      if (paragraphBreak > start + maxSize / 2) {
        end = paragraphBreak;
      } else {
        const sentenceMatch = findLastSentenceEnd(text, start, end);
        if (sentenceMatch > start + maxSize / 2) {
          end = sentenceMatch;
        }
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    if (end >= text.length) {
      break;
    }

    const nextStart = end - overlap;
    if (nextStart <= start) {
      start = end;
    } else {
      start = nextStart;
    }
  }

  return chunks;
}

function findLastSentenceEnd(text: string, start: number, end: number): number {
  const segment = text.slice(start, end);
  const matches = [...segment.matchAll(new RegExp(SENTENCE_END_PATTERN, "g"))];
  if (matches.length === 0) {
    return end;
  }
  const lastMatch = matches.at(-1);
  if (!lastMatch || lastMatch.index === undefined) {
    return end;
  }
  return start + lastMatch.index + lastMatch[0].length;
}

function hashOutline(outline: OutlineNode[]): string {
  const titles = flattenOutlineTitles(outline);
  return createHash("sha256")
    .update(titles.join("|"))
    .digest("hex")
    .slice(0, 16);
}

function flattenOutlineTitles(outline: OutlineNode[]): string[] {
  const titles: string[] = [];
  for (const node of outline) {
    titles.push(node.title);
    titles.push(...flattenOutlineTitles(node.children));
  }
  return titles;
}

function countSections(outline: OutlineNode[]): number {
  let count = outline.length;
  for (const node of outline) {
    count += countSections(node.children);
  }
  return count;
}

function calculateMaxDepth(outline: OutlineNode[], depth = 1): number {
  if (outline.length === 0) {
    return 0;
  }
  let maxChildDepth = depth;
  for (const node of outline) {
    if (node.children.length > 0) {
      maxChildDepth = Math.max(
        maxChildDepth,
        calculateMaxDepth(node.children, depth + 1)
      );
    }
  }
  return maxChildDepth;
}
