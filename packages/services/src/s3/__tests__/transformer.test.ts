import { describe, expect, it } from "bun:test";
import type { S3TransformContext } from "@openbeam/types/services/connectors/s3";
import type { S3Object } from "../client";
import { transformObject, transformObjects } from "../transformers/object";

const context: S3TransformContext = {
  connectorId: "conn_s3_test",
  connectorType: "S3",
  teamId: "team_test",
  workspaceId: "ws_test",
  region: "us-east-1",
  bucketName: "test-bucket",
};

describe("transformObject", () => {
  it("transforms a basic S3 object to GenericDocument", async () => {
    const obj: S3Object = {
      key: "documents/report.pdf",
      lastModified: "2024-01-15T10:30:00.000Z",
      etag: "abc123def456",
      size: 2_500_000,
      storageClass: "STANDARD",
    };

    const doc = await transformObject(obj, context);

    expect(doc.id).toBe("conn_s3_test_object_documents/report.pdf");
    expect(doc.title).toBe("report.pdf");
    expect(doc.document_type).toBe("file");
    expect(doc.document_subtype).toBe("pdf");
    expect(doc.connector_id).toBe("conn_s3_test");
    expect(doc.connector_type).toBe("S3");
    expect(doc.team_id).toBe("team_test");
    expect(doc.workspace_id).toBe("ws_test");
    expect(doc.external_id).toBe("documents/report.pdf");
    expect(doc.source_type).toBe("s3");
    expect(doc.is_public).toBe(false);
    expect(doc.access_control).toEqual(["team:team_test"]);
    expect(doc.checksum).toBeTruthy();
  });

  it("extracts file metadata correctly", async () => {
    const obj: S3Object = {
      key: "data/large-file.csv",
      lastModified: "2024-06-01T00:00:00.000Z",
      etag: "xyz789",
      size: 1_073_741_824,
      storageClass: "GLACIER",
    };

    const doc = await transformObject(obj, context);
    const metadata = doc.metadata as Record<string, unknown>;

    expect(metadata.key).toBe("data/large-file.csv");
    expect(metadata.fileName).toBe("large-file.csv");
    expect(metadata.fileExtension).toBe("csv");
    expect(metadata.sizeBytes).toBe(1_073_741_824);
    expect(metadata.storageClass).toBe("GLACIER");
    expect(metadata.etag).toBe("xyz789");
    expect(metadata.bucket).toBe("test-bucket");
    expect(metadata.region).toBe("us-east-1");
    expect(metadata.prefix).toBe("data/");
  });

  it("handles root-level objects without folder prefix", async () => {
    const obj: S3Object = {
      key: "readme.txt",
      lastModified: "2024-03-01T12:00:00.000Z",
      etag: "aaa",
      size: 256,
      storageClass: "STANDARD",
    };

    const doc = await transformObject(obj, context);
    const metadata = doc.metadata as Record<string, unknown>;

    expect(doc.title).toBe("readme.txt");
    expect(metadata.prefix).toBe("");
  });

  it("handles objects without file extension", async () => {
    const obj: S3Object = {
      key: "data/Makefile",
      lastModified: "2024-01-01T00:00:00.000Z",
      etag: "bbb",
      size: 1024,
      storageClass: "STANDARD",
    };

    const doc = await transformObject(obj, context);

    expect(doc.document_subtype).toBe("unknown");
    expect(doc.title).toBe("Makefile");
  });

  it("builds correct console URL", async () => {
    const obj: S3Object = {
      key: "path/to/file.json",
      lastModified: "2024-01-01T00:00:00.000Z",
      etag: "ccc",
      size: 512,
      storageClass: "STANDARD",
    };

    const doc = await transformObject(obj, context);

    expect(doc.url).toContain("s3.console.aws.amazon.com");
    expect(doc.url).toContain("test-bucket");
    expect(doc.url).toContain("us-east-1");
  });

  it("transforms multiple objects in batch", async () => {
    const objects: S3Object[] = [
      {
        key: "a.txt",
        lastModified: "2024-01-01T00:00:00.000Z",
        etag: "1",
        size: 100,
        storageClass: "STANDARD",
      },
      {
        key: "b.pdf",
        lastModified: "2024-02-01T00:00:00.000Z",
        etag: "2",
        size: 200,
        storageClass: "STANDARD",
      },
    ];

    const docs = await transformObjects(objects, context);

    expect(docs).toHaveLength(2);
    expect(docs[0]?.title).toBe("a.txt");
    expect(docs[1]?.title).toBe("b.pdf");
  });

  it("produces deterministic checksum for identical content", async () => {
    const obj: S3Object = {
      key: "test.txt",
      lastModified: "2024-01-01T00:00:00.000Z",
      etag: "same",
      size: 100,
      storageClass: "STANDARD",
    };

    const doc1 = await transformObject(obj, context);
    const doc2 = await transformObject(obj, context);

    expect(doc1.checksum).toBe(doc2.checksum);
  });
});
