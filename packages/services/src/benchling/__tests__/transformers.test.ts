import { describe, expect, test } from "bun:test";
import type { BenchlingTransformContext } from "@openbeam/types/services/connectors/benchling";
import type { BenchlingAssayResult } from "../api/assay-results";
import type { BenchlingEntry } from "../api/entries";
import type { BenchlingFolder } from "../api/folders";
import type { BenchlingProject } from "../api/projects";
import type {
  BenchlingAaSequence,
  BenchlingDnaSequence,
} from "../api/sequences";
import { transformAssayResult } from "../transformers/assay-result";
import { transformEntry } from "../transformers/entry";
import { transformFolder } from "../transformers/folder";
import { transformProject } from "../transformers/project";
import {
  transformAaSequence,
  transformDnaSequence,
} from "../transformers/sequence";
import {
  buildBenchlingUrl,
  formatFieldsAsContent,
  stripHtml,
} from "../transformers/utils";

const context: BenchlingTransformContext = {
  connectorId: "conn_benchling_1",
  connectorType: "BENCHLING",
  teamId: "team_1",
  workspaceId: "ws_1",
  tenant: "mycompany",
};

describe("transformEntry", () => {
  const entry: BenchlingEntry = {
    id: "etr_001",
    displayId: "EXP-001",
    name: "PCR Amplification Protocol",
    folderId: "lib_001",
    authors: [{ id: "usr_1", name: "Dr. Smith" }],
    createdAt: "2025-01-15T10:00:00Z",
    modifiedAt: "2025-06-20T14:30:00Z",
    schema: { id: "sch_1", name: "Experiment Protocol" },
    fields: {
      objective: {
        value: "Amplify target gene",
        displayValue: "Amplify target gene",
      },
    },
    webURL: "https://mycompany.benchling.com/entries/etr_001",
    apiURL: "https://mycompany.benchling.com/api/v2/entries/etr_001",
    reviewRecord: { status: "ACCEPTED" },
  };

  test("produces valid GenericDocument", async () => {
    const doc = await transformEntry(entry, context);
    expect(doc.id).toBe("conn_benchling_1_entry_etr_001");
    expect(doc.document_type).toBe("document");
    expect(doc.document_subtype).toBe("notebook_entry");
    expect(doc.title).toBe("PCR Amplification Protocol");
    expect(doc.source_type).toBe("benchling");
    expect(doc.author_name).toBe("Dr. Smith");
    expect(doc.url).toBe("https://mycompany.benchling.com/entries/etr_001");
    expect(doc.metadata?.schema).toBe("Experiment Protocol");
    expect(doc.metadata?.reviewStatus).toBe("ACCEPTED");
    expect(doc.checksum).toBeDefined();
    expect(doc.content).toContain("Amplify target gene");
  });
});

describe("transformFolder", () => {
  const folder: BenchlingFolder = {
    id: "lib_001",
    name: "Experiments Q1",
    parentFolderId: "lib_root",
    projectId: "src_proj1",
    createdAt: "2025-01-01T00:00:00Z",
    modifiedAt: "2025-06-10T12:00:00Z",
    webURL: "https://mycompany.benchling.com/folders/lib_001",
  };

  test("produces valid GenericDocument", async () => {
    const doc = await transformFolder(folder, context);
    expect(doc.id).toBe("conn_benchling_1_folder_lib_001");
    expect(doc.document_subtype).toBe("folder");
    expect(doc.metadata?.projectId).toBe("src_proj1");
    expect(doc.metadata?.parentFolderId).toBe("lib_root");
  });
});

describe("transformProject", () => {
  const project: BenchlingProject = {
    id: "src_proj1",
    name: "Gene Therapy Research",
    owner: { id: "usr_1", name: "Dr. Jones" },
    createdAt: "2024-06-01T00:00:00Z",
    modifiedAt: "2025-03-15T09:00:00Z",
    webURL: "https://mycompany.benchling.com/projects/src_proj1",
  };

  test("produces valid GenericDocument", async () => {
    const doc = await transformProject(project, context);
    expect(doc.id).toBe("conn_benchling_1_project_src_proj1");
    expect(doc.document_subtype).toBe("project");
    expect(doc.author_name).toBe("Dr. Jones");
    expect(doc.metadata?.owner).toBe("Dr. Jones");
  });
});

describe("transformDnaSequence", () => {
  const seq: BenchlingDnaSequence = {
    id: "seq_dna_001",
    name: "pUC19 Plasmid",
    bases: "ATCGATCG",
    length: 2686,
    isCircular: true,
    folderId: "lib_001",
    annotations: [
      { name: "AmpR", type: "CDS", start: 100, end: 900, strand: 1 },
      { name: "ori", type: "rep_origin", start: 1200, end: 1800, strand: 1 },
    ],
    schema: { id: "sch_2", name: "Plasmid" },
    createdAt: "2025-02-01T00:00:00Z",
    modifiedAt: "2025-05-10T00:00:00Z",
    webURL: "https://mycompany.benchling.com/sequences/seq_dna_001",
    entityRegistryId: "REG-001",
  };

  test("produces valid GenericDocument", async () => {
    const doc = await transformDnaSequence(seq, context);
    expect(doc.id).toBe("conn_benchling_1_dna_seq_dna_001");
    expect(doc.document_subtype).toBe("dna_sequence");
    expect(doc.metadata?.sequenceType).toBe("dna");
    expect(doc.metadata?.length).toBe("2686");
    expect(doc.metadata?.isCircular).toBe(true);
    expect(doc.metadata?.annotationCount).toBe("2");
    expect(doc.metadata?.registryId).toBe("REG-001");
    expect(doc.content).toContain("AmpR (CDS)");
    expect(doc.content).toContain("ori (rep_origin)");
  });
});

describe("transformAaSequence", () => {
  const seq: BenchlingAaSequence = {
    id: "seq_aa_001",
    name: "GFP Protein",
    aminoAcids: "MSKGEELFTG",
    length: 238,
    folderId: "lib_002",
    annotations: [
      { name: "Chromophore", type: "domain", start: 65, end: 67, strand: 1 },
    ],
    schema: { id: "sch_3", name: "Protein" },
    createdAt: "2025-03-01T00:00:00Z",
    modifiedAt: "2025-04-15T00:00:00Z",
    webURL: "https://mycompany.benchling.com/sequences/seq_aa_001",
    entityRegistryId: "REG-002",
  };

  test("produces valid GenericDocument", async () => {
    const doc = await transformAaSequence(seq, context);
    expect(doc.id).toBe("conn_benchling_1_aa_seq_aa_001");
    expect(doc.document_subtype).toBe("protein_sequence");
    expect(doc.metadata?.sequenceType).toBe("protein");
    expect(doc.metadata?.length).toBe("238");
    expect(doc.content).toContain("Chromophore (domain)");
  });
});

describe("transformAssayResult", () => {
  const result: BenchlingAssayResult = {
    id: "assay_001",
    schema: { id: "sch_4", name: "ELISA Assay" },
    fields: {
      concentration: { value: 45.2, displayValue: "45.2 ng/mL" },
      sample_id: { value: "SMP-001", displayValue: "SMP-001" },
    },
    entryId: "etr_001",
    projectId: "src_proj1",
    createdAt: "2025-04-01T00:00:00Z",
    modifiedAt: "2025-04-01T12:00:00Z",
  };

  test("produces valid GenericDocument", async () => {
    const doc = await transformAssayResult(result, context);
    expect(doc.id).toBe("conn_benchling_1_assay_assay_001");
    expect(doc.document_subtype).toBe("assay_result");
    expect(doc.title).toBe("ELISA Assay - assay_001");
    expect(doc.metadata?.schema).toBe("ELISA Assay");
    expect(doc.metadata?.entryId).toBe("etr_001");
    expect(doc.content).toContain("45.2 ng/mL");
    expect(doc.content).toContain("SMP-001");
  });
});

describe("utils", () => {
  test("buildBenchlingUrl constructs correct URL", () => {
    expect(buildBenchlingUrl("mycompany", "/entries/etr_001")).toBe(
      "https://mycompany.benchling.com/entries/etr_001"
    );
  });

  test("stripHtml removes HTML tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  test("formatFieldsAsContent formats fields", () => {
    const fields = {
      name: { value: "Test", displayValue: "Test" },
      count: { value: 42, displayValue: "42" },
    };
    const content = formatFieldsAsContent(fields);
    expect(content).toContain("name: Test");
    expect(content).toContain("count: 42");
  });
});
