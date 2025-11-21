/**
 * Checksum Deduplication Tests
 * 
 * Tests document content hashing for change detection and deduplication.
 * 
 * Run: bun test tests/checksum.test.ts
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  calculateChecksum,
  calculateDocumentChecksum,
  checksumsMatch,
} from "../src/utils/checksum";
import { cleanupTestData } from "./setup";

beforeAll(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe("Checksum Utilities", () => {
  test("calculate SHA-256 checksum from string", () => {
    const content = "Hello, World!";
    const checksum = calculateChecksum(content);

    expect(checksum).toBeTypeOf("string");
    expect(checksum.length).toBe(64); // SHA-256 = 32 bytes = 64 hex chars
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  test("same content produces same checksum", () => {
    const content = "Test content";
    const checksum1 = calculateChecksum(content);
    const checksum2 = calculateChecksum(content);

    expect(checksum1).toBe(checksum2);
  });

  test("different content produces different checksums", () => {
    const checksum1 = calculateChecksum("Content A");
    const checksum2 = calculateChecksum("Content B");

    expect(checksum1).not.toBe(checksum2);
  });

  test("calculate document checksum from title and content", () => {
    const doc = {
      title: "Test Document",
      content: "This is the document body.",
    };

    const checksum = calculateDocumentChecksum(doc);
    expect(checksum).toBeTypeOf("string");
    expect(checksum.length).toBe(64);
  });

  test("document checksum uses different field names", () => {
    const doc1 = { title: "Title", content: "Body" };
    const doc2 = { title: "Title", body: "Body" }; // 'body' instead of 'content'
    const doc3 = { title: "Title", text: "Body" }; // 'text' instead of 'content'

    const checksum1 = calculateDocumentChecksum(doc1);
    const checksum2 = calculateDocumentChecksum(doc2);
    const checksum3 = calculateDocumentChecksum(doc3);

    expect(checksum1).toBe(checksum2);
    expect(checksum2).toBe(checksum3);
  });

  test("document checksum handles missing fields", () => {
    const doc1 = { title: "Title" }; // No content
    const doc2 = { content: "Content" }; // No title

    const checksum1 = calculateDocumentChecksum(doc1);
    const checksum2 = calculateDocumentChecksum(doc2);

    expect(checksum1).toBeTypeOf("string");
    expect(checksum2).toBeTypeOf("string");
    expect(checksum1).not.toBe(checksum2);
  });

  test("checksums match when both are same", () => {
    const checksum = "abc123";
    expect(checksumsMatch(checksum, checksum)).toBe(true);
  });

  test("checksums do not match when different", () => {
    expect(checksumsMatch("abc123", "def456")).toBe(false);
  });

  test("checksums do not match when null or undefined", () => {
    expect(checksumsMatch(null, "abc123")).toBe(false);
    expect(checksumsMatch("abc123", null)).toBe(false);
    expect(checksumsMatch(undefined, "abc123")).toBe(false);
    expect(checksumsMatch(null, null)).toBe(false);
    expect(checksumsMatch(undefined, undefined)).toBe(false);
  });

  test("empty content produces valid checksum", () => {
    const checksum = calculateChecksum("");
    expect(checksum).toBeTypeOf("string");
    expect(checksum.length).toBe(64);
  });

  test("unicode content is handled correctly", () => {
    const content = "Hello World Unicode";
    const checksum1 = calculateChecksum(content);
    const checksum2 = calculateChecksum(content);

    expect(checksum1).toBe(checksum2);
    expect(checksum1).toMatch(/^[a-f0-9]{64}$/);
  });
});

