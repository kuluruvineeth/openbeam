import { describe, expect, it } from "bun:test";
import type { DocuSignTransformContext } from "@openbeam/types/services/connectors/docusign";
import { transformDocuSignEnvelope } from "../transformers/envelope";
import { transformDocuSignFolder } from "../transformers/folder";
import { transformDocuSignTemplate } from "../transformers/template";

const context: DocuSignTransformContext = {
  connectorId: "conn_ds_1",
  connectorType: "DOCUSIGN",
  teamId: "team_1",
  workspaceId: "ws_1",
  accountBaseUri: "https://na3.docusign.net",
  accountId: "acc_123",
};

describe("transformDocuSignEnvelope", () => {
  it("transforms an envelope with recipients", () => {
    const envelope = {
      envelopeId: "env-001",
      status: "completed",
      emailSubject: "Please sign the NDA",
      emailBlurb: "Attached is the NDA for your review.",
      sentDateTime: "2026-03-01T10:00:00Z",
      createdDateTime: "2026-03-01T09:00:00Z",
      lastModifiedDateTime: "2026-03-02T15:00:00Z",
      completedDateTime: "2026-03-02T14:00:00Z",
      sender: {
        userName: "Alice Sender",
        email: "alice@example.com",
      },
      recipients: {
        signers: [
          {
            recipientId: "1",
            name: "Bob Signer",
            email: "bob@example.com",
            status: "completed",
            signedDateTime: "2026-03-02T14:00:00Z",
          },
        ],
        carbonCopies: [
          {
            recipientId: "2",
            name: "Carol CC",
            email: "carol@example.com",
            status: "completed",
          },
        ],
      },
    };

    const doc = transformDocuSignEnvelope(envelope, context);

    expect(doc.id).toBe("conn_ds_1_envelope_env-001");
    expect(doc.document_type).toBe("envelope");
    expect(doc.document_subtype).toBe("completed");
    expect(doc.title).toBe("Please sign the NDA");
    expect(doc.author_name).toBe("Alice Sender");
    expect(doc.author_email).toBe("alice@example.com");
    expect(doc.metadata?.status).toBe("completed");
    expect(doc.metadata?.recipientCount).toBe("2");
    expect(doc.metadata?.signerCount).toBe("1");
    expect(doc.metadata?.completedDate).toBe("2026-03-02T14:00:00Z");
    expect(doc.content).toContain("Bob Signer");
    expect(doc.content).toContain("Carol CC");
    expect(doc.content).toContain("Attached is the NDA");
  });

  it("handles envelope without recipients", () => {
    const envelope = {
      envelopeId: "env-002",
      status: "created",
      emailSubject: "Draft Agreement",
      createdDateTime: "2026-03-10T08:00:00Z",
      lastModifiedDateTime: "2026-03-10T08:00:00Z",
    };

    const doc = transformDocuSignEnvelope(envelope, context);

    expect(doc.id).toBe("conn_ds_1_envelope_env-002");
    expect(doc.document_type).toBe("envelope");
    expect(doc.title).toBe("Draft Agreement");
    expect(doc.metadata?.recipientCount).toBe("0");
    expect(doc.metadata?.signerCount).toBe("0");
  });

  it("handles voided envelope", () => {
    const envelope = {
      envelopeId: "env-003",
      status: "voided",
      emailSubject: "Voided Contract",
      createdDateTime: "2026-02-01T10:00:00Z",
      lastModifiedDateTime: "2026-03-15T12:00:00Z",
      voidedDateTime: "2026-03-15T12:00:00Z",
      voidedReason: "Contract terms changed",
    };

    const doc = transformDocuSignEnvelope(envelope, context);

    expect(doc.document_subtype).toBe("voided");
    expect(doc.content).toContain("Voided: Contract terms changed");
    expect(doc.metadata?.voidedDate).toBe("2026-03-15T12:00:00Z");
  });
});

describe("transformDocuSignTemplate", () => {
  it("transforms a template with all fields", () => {
    const template = {
      templateId: "tpl-001",
      name: "Standard NDA",
      description: "Non-disclosure agreement template",
      shared: "true",
      created: "2025-01-15T10:00:00Z",
      lastModified: "2026-02-20T14:00:00Z",
      emailSubject: "NDA for signature",
      emailBlurb: "Please review and sign the NDA.",
      folderName: "Legal Templates",
      folderId: "folder-10",
      pageCount: 3,
      owner: {
        userName: "Legal Team",
        email: "legal@example.com",
      },
    };

    const doc = transformDocuSignTemplate(template, context);

    expect(doc.id).toBe("conn_ds_1_template_tpl-001");
    expect(doc.document_type).toBe("template");
    expect(doc.document_subtype).toBe("shared");
    expect(doc.title).toBe("Standard NDA");
    expect(doc.author_name).toBe("Legal Team");
    expect(doc.content).toContain("Non-disclosure agreement template");
    expect(doc.content).toContain("NDA for signature");
    expect(doc.content).toContain("Legal Templates");
    expect(doc.metadata?.shared).toBe("true");
    expect(doc.metadata?.folderName).toBe("Legal Templates");
    expect(doc.metadata?.pageCount).toBe("3");
  });

  it("handles private template with minimal fields", () => {
    const template = {
      templateId: "tpl-002",
      name: "My Draft",
      shared: "false",
      created: "2026-03-01T10:00:00Z",
      lastModified: "2026-03-01T10:00:00Z",
    };

    const doc = transformDocuSignTemplate(template, context);

    expect(doc.document_subtype).toBe("private");
    expect(doc.metadata?.shared).toBe("false");
  });
});

describe("transformDocuSignFolder", () => {
  it("transforms a folder with counts", () => {
    const folder = {
      folderId: "fld-001",
      name: "Contracts",
      type: "normal",
      itemCount: "42",
      subFolderCount: "3",
      hasSubFolders: "true",
      ownerUserName: "Admin User",
      ownerEmail: "admin@example.com",
    };

    const doc = transformDocuSignFolder(folder, context);

    expect(doc.id).toBe("conn_ds_1_folder_fld-001");
    expect(doc.document_type).toBe("folder");
    expect(doc.document_subtype).toBe("normal");
    expect(doc.title).toBe("Contracts");
    expect(doc.author_name).toBe("Admin User");
    expect(doc.content).toContain("Items: 42");
    expect(doc.content).toContain("Subfolders: 3");
    expect(doc.metadata?.folderType).toBe("normal");
    expect(doc.metadata?.itemCount).toBe("42");
  });

  it("handles folder with parent reference", () => {
    const folder = {
      folderId: "fld-002",
      name: "Active",
      type: "normal",
      parentFolderId: "fld-001",
    };

    const doc = transformDocuSignFolder(folder, context);

    expect(doc.metadata?.parentFolderId).toBe("fld-001");
  });
});
