import { describe, expect, it } from "bun:test";
import type { DropboxTransformContext } from "@openbeam/types/services/connectors/dropbox";
import type { DropboxEntry } from "../client";
import { transformDropboxFile } from "../transformers/file";

const CONTEXT: DropboxTransformContext = {
  connectorId: "conn_dbx_1",
  connectorType: "DROPBOX",
  teamId: "team_1",
  workspaceId: "ws_1",
  accountId: "dbid:AABcd123",
};

function makeFile(overrides: Partial<DropboxEntry> = {}): DropboxEntry {
  return {
    ".tag": "file",
    id: "id:abc123",
    name: "report.pdf",
    path_lower: "/documents/report.pdf",
    path_display: "/Documents/report.pdf",
    server_modified: "2026-01-15T10:30:00Z",
    client_modified: "2026-01-14T08:00:00Z",
    size: 2_048_576,
    content_hash: "hash123abc",
    ...overrides,
  };
}

describe("transformDropboxFile", () => {
  it("transforms a file entry with all fields", () => {
    const entry = makeFile();
    const doc = transformDropboxFile(entry, CONTEXT);

    expect(doc.id).toBe("conn_dbx_1_file_id:abc123");
    expect(doc.connector_id).toBe("conn_dbx_1");
    expect(doc.connector_type).toBe("DROPBOX");
    expect(doc.team_id).toBe("team_1");
    expect(doc.document_type).toBe("file");
    expect(doc.document_subtype).toBe("document");
    expect(doc.title).toBe("report.pdf");
    expect(doc.url).toBe("https://www.dropbox.com/home/Documents/report.pdf");
    expect(doc.metadata?.extension).toBe("pdf");
    expect(doc.metadata?.size).toBe(2_048_576);
    expect(doc.metadata?.contentHash).toBe("hash123abc");
    expect(doc.metadata?.path).toBe("/documents/report.pdf");
  });

  it("classifies file types by extension", () => {
    const xlsx = transformDropboxFile(makeFile({ name: "data.xlsx" }), CONTEXT);
    expect(xlsx.document_subtype).toBe("spreadsheet");

    const pptx = transformDropboxFile(
      makeFile({ name: "slides.pptx" }),
      CONTEXT
    );
    expect(pptx.document_subtype).toBe("presentation");

    const png = transformDropboxFile(makeFile({ name: "photo.png" }), CONTEXT);
    expect(png.document_subtype).toBe("image");

    const unknown = transformDropboxFile(
      makeFile({ name: "data.bin" }),
      CONTEXT
    );
    expect(unknown.document_subtype).toBe("file");
  });

  it("transforms a folder entry", () => {
    const folder: DropboxEntry = {
      ".tag": "folder",
      id: "id:folder_1",
      name: "Projects",
      path_lower: "/projects",
      path_display: "/Projects",
    };
    const doc = transformDropboxFile(folder, CONTEXT);

    expect(doc.document_type).toBe("folder");
    expect(doc.document_subtype).toBe("folder");
    expect(doc.title).toBe("Projects");
    expect(doc.metadata?.extension).toBeUndefined();
    expect(doc.metadata?.size).toBeUndefined();
  });

  it("handles shared files", () => {
    const entry = makeFile({
      sharing_info: {
        shared_folder_id: "sf_123",
      },
    });
    const doc = transformDropboxFile(entry, CONTEXT);

    expect(doc.metadata?.shared).toBe(true);
  });

  it("uses client_modified for createdAt when available", () => {
    const entry = makeFile({
      client_modified: "2026-01-14T08:00:00Z",
      server_modified: "2026-01-15T10:30:00Z",
    });
    const doc = transformDropboxFile(entry, CONTEXT);

    expect(doc.created_at).toBe(new Date("2026-01-14T08:00:00Z").getTime());
    expect(doc.updated_at).toBe(new Date("2026-01-15T10:30:00Z").getTime());
  });

  it("falls back gracefully when timestamps are missing", () => {
    const entry = makeFile({
      client_modified: undefined,
      server_modified: undefined,
    });
    const doc = transformDropboxFile(entry, CONTEXT);

    expect(doc.created_at).toBeGreaterThan(0);
    expect(doc.updated_at).toBe(doc.created_at);
  });

  it("includes parentPath in metadata", () => {
    const entry = makeFile({
      path_display: "/Work/Reports/Q1/report.pdf",
    });
    const doc = transformDropboxFile(entry, CONTEXT);

    expect(doc.metadata?.parentPath).toBe("/Work/Reports/Q1");
  });
});
