import { describe, expect, it } from "bun:test";
import type { EgnyteTransformContext } from "@openbeam/types/services/connectors/egnyte";
import type { EgnyteFileEntry, EgnyteLink } from "../client";
import { transformEgnyteFile } from "../transformers/file";
import { transformEgnyteLink } from "../transformers/link";

const CONTEXT: EgnyteTransformContext = {
  connectorId: "conn_egnyte_1",
  connectorType: "EGNYTE",
  teamId: "team_1",
  workspaceId: "ws_1",
  domain: "acme",
};

function makeFile(overrides: Partial<EgnyteFileEntry> = {}): EgnyteFileEntry {
  return {
    name: "report.pdf",
    path: "/Shared/Documents/report.pdf",
    is_folder: false,
    locked: false,
    entry_id: "entry_abc123",
    size: 2_048_576,
    checksum: "sha512checksum",
    last_modified: "2026-01-15T10:30:00Z",
    created: "2026-01-14T08:00:00Z",
    uploaded_by: "jdoe",
    ...overrides,
  };
}

function makeFolder(overrides: Partial<EgnyteFileEntry> = {}): EgnyteFileEntry {
  return {
    name: "Projects",
    path: "/Shared/Projects",
    is_folder: true,
    locked: false,
    folder_id: "folder_xyz",
    num_files: 42,
    num_folders: 5,
    last_modified: "2026-01-15T10:30:00Z",
    created: "2026-01-10T09:00:00Z",
    ...overrides,
  };
}

function makeLink(overrides: Partial<EgnyteLink> = {}): EgnyteLink {
  return {
    id: "link_001",
    url: "https://acme.egnyte.com/dl/abc123",
    path: "/Shared/Documents/report.pdf",
    type: "file",
    accessibility: "domain",
    creation_date: "2026-01-20T14:00:00Z",
    created_by: "jdoe",
    link_to_current: true,
    ...overrides,
  };
}

describe("transformEgnyteFile", () => {
  it("transforms a file entry with all fields", () => {
    const entry = makeFile();
    const doc = transformEgnyteFile(entry, CONTEXT);

    expect(doc.id).toBe("conn_egnyte_1_file_entry_abc123");
    expect(doc.connector_id).toBe("conn_egnyte_1");
    expect(doc.connector_type).toBe("EGNYTE");
    expect(doc.team_id).toBe("team_1");
    expect(doc.document_type).toBe("file");
    expect(doc.document_subtype).toBe("document");
    expect(doc.title).toBe("report.pdf");
    expect(doc.author_name).toBe("jdoe");
    expect(doc.metadata?.extension).toBe("pdf");
    expect(doc.metadata?.size).toBe(2_048_576);
    expect(doc.metadata?.checksum).toBe("sha512checksum");
    expect(doc.metadata?.path).toBe("/Shared/Documents/report.pdf");
    expect(doc.metadata?.parentPath).toBe("/Shared/Documents");
  });

  it("classifies file types by extension", () => {
    const xlsx = transformEgnyteFile(
      makeFile({ name: "data.xlsx", path: "/data.xlsx" }),
      CONTEXT
    );
    expect(xlsx.document_subtype).toBe("spreadsheet");

    const pptx = transformEgnyteFile(
      makeFile({ name: "slides.pptx", path: "/slides.pptx" }),
      CONTEXT
    );
    expect(pptx.document_subtype).toBe("presentation");

    const png = transformEgnyteFile(
      makeFile({ name: "photo.png", path: "/photo.png" }),
      CONTEXT
    );
    expect(png.document_subtype).toBe("image");

    const bin = transformEgnyteFile(
      makeFile({ name: "data.bin", path: "/data.bin" }),
      CONTEXT
    );
    expect(bin.document_subtype).toBe("file");
  });

  it("transforms a folder entry", () => {
    const folder = makeFolder();
    const doc = transformEgnyteFile(folder, CONTEXT);

    expect(doc.document_type).toBe("folder");
    expect(doc.document_subtype).toBe("folder");
    expect(doc.title).toBe("Projects");
    expect(doc.metadata?.fileCount).toBe(42);
    expect(doc.metadata?.folderCount).toBe(5);
    expect(doc.metadata?.extension).toBeUndefined();
    expect(doc.metadata?.size).toBeUndefined();
  });

  it("builds correct URL with domain", () => {
    const entry = makeFile();
    const doc = transformEgnyteFile(entry, CONTEXT);

    expect(doc.url).toContain("acme.egnyte.com");
  });

  it("uses created timestamp for createdAt", () => {
    const entry = makeFile({
      created: "2026-01-14T08:00:00Z",
      last_modified: "2026-01-15T10:30:00Z",
    });
    const doc = transformEgnyteFile(entry, CONTEXT);

    expect(doc.created_at).toBe(new Date("2026-01-14T08:00:00Z").getTime());
    expect(doc.updated_at).toBe(new Date("2026-01-15T10:30:00Z").getTime());
  });

  it("falls back when timestamps are missing", () => {
    const entry = makeFile({
      created: undefined,
      last_modified: undefined,
    });
    const doc = transformEgnyteFile(entry, CONTEXT);

    expect(doc.created_at).toBeGreaterThan(0);
    expect(doc.updated_at).toBe(doc.created_at);
  });

  it("includes locked status in metadata", () => {
    const entry = makeFile({ locked: true });
    const doc = transformEgnyteFile(entry, CONTEXT);

    expect(doc.metadata?.locked).toBe(true);
  });

  it("uses folder_id as fallback identifier", () => {
    const folder = makeFolder();
    const doc = transformEgnyteFile(folder, CONTEXT);

    expect(doc.id).toBe("conn_egnyte_1_folder_folder_xyz");
    expect(doc.external_id).toBe("folder_xyz");
  });

  it("falls back to path when no entry_id or folder_id", () => {
    const entry = makeFile({
      entry_id: undefined,
    });
    const doc = transformEgnyteFile(entry, CONTEXT);

    expect(doc.external_id).toBe("/Shared/Documents/report.pdf");
  });

  it("sets is_public to false for files", () => {
    const entry = makeFile();
    const doc = transformEgnyteFile(entry, CONTEXT);

    expect(doc.is_public).toBe(false);
  });
});

describe("transformEgnyteLink", () => {
  it("transforms a shared link", () => {
    const link = makeLink();
    const doc = transformEgnyteLink(link, CONTEXT);

    expect(doc.id).toBe("conn_egnyte_1_link_link_001");
    expect(doc.document_type).toBe("link");
    expect(doc.title).toBe("report.pdf");
    expect(doc.url).toBe("https://acme.egnyte.com/dl/abc123");
    expect(doc.author_name).toBe("jdoe");
    expect(doc.metadata?.accessibility).toBe("domain");
    expect(doc.metadata?.linkType).toBe("file");
  });

  it("marks domain-accessible links as public", () => {
    const link = makeLink({ accessibility: "domain" });
    const doc = transformEgnyteLink(link, CONTEXT);
    expect(doc.is_public).toBe(true);
  });

  it("marks anyone-accessible links as public", () => {
    const link = makeLink({ accessibility: "anyone" });
    const doc = transformEgnyteLink(link, CONTEXT);
    expect(doc.is_public).toBe(true);
  });

  it("marks password-protected links as non-public", () => {
    const link = makeLink({ accessibility: "password" });
    const doc = transformEgnyteLink(link, CONTEXT);
    expect(doc.is_public).toBe(false);
  });

  it("includes expiry date when present", () => {
    const link = makeLink({ expiry_date: "2026-03-01T00:00:00Z" });
    const doc = transformEgnyteLink(link, CONTEXT);
    expect(doc.metadata?.expiryDate).toBe("2026-03-01T00:00:00Z");
  });

  it("classifies link subtype based on path extension", () => {
    const pdfLink = makeLink({ path: "/Shared/report.pdf" });
    const doc = transformEgnyteLink(pdfLink, CONTEXT);
    expect(doc.document_subtype).toBe("document");
  });

  it("handles folder-type links", () => {
    const folderLink = makeLink({
      type: "folder",
      path: "/Shared/Projects",
    });
    const doc = transformEgnyteLink(folderLink, CONTEXT);
    expect(doc.document_subtype).toBe("folder");
  });

  it("serializes recipients as JSON string", () => {
    const link = makeLink({
      recipients: ["alice@example.com", "bob@example.com"],
    });
    const doc = transformEgnyteLink(link, CONTEXT);
    expect(doc.metadata?.recipients).toBe(
      '["alice@example.com","bob@example.com"]'
    );
  });
});
