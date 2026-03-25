import { describe, expect, it } from "bun:test";
import type { JFrogTransformContext } from "@openbeam/types/services/connectors/jfrog";
import type { JFrogArtifact } from "../api/artifacts";
import type { JFrogBuild } from "../api/builds";
import type { JFrogRepository } from "../api/repositories";
import type { JFrogViolation } from "../api/violations";
import { transformArtifact } from "../transformers/artifact";
import { transformBuild } from "../transformers/build";
import { transformRepository } from "../transformers/repository";
import {
  formatDuration,
  formatFileSize,
  formatSeverity,
} from "../transformers/utils";
import { transformViolation } from "../transformers/violation";

const context: JFrogTransformContext = {
  connectorId: "conn_jfrog_123",
  connectorType: "JFROG",
  teamId: "team_456",
  workspaceId: "ws_789",
  instanceUrl: "https://mycompany.jfrog.io",
};

describe("transformRepository", () => {
  const repo: JFrogRepository = {
    key: "docker-local",
    description: "Local Docker repository for production images",
    type: "local",
    url: "https://mycompany.jfrog.io/artifactory/docker-local",
    packageType: "docker",
    layoutRef: "simple-default",
    environments: ["PROD", "DEV"],
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformRepository(repo, context);

    expect(doc.id).toBe("conn_jfrog_123_repository_docker-local");
    expect(doc.connector_id).toBe("conn_jfrog_123");
    expect(doc.connector_type).toBe("JFROG");
    expect(doc.team_id).toBe("team_456");
    expect(doc.external_id).toBe("docker-local");
    expect(doc.document_type).toBe("repository");
    expect(doc.document_subtype).toBe("docker");
    expect(doc.title).toBe("docker-local");
    expect(doc.source_type).toBe("jfrog");
    expect(doc.checksum).toBeDefined();
  });

  it("includes metadata fields", async () => {
    const doc = await transformRepository(repo, context);

    expect(doc.metadata).toMatchObject({
      repoKey: "docker-local",
      repoType: "local",
      packageType: "docker",
      layoutRef: "simple-default",
      environments: "PROD, DEV",
    });
  });

  it("includes description in content", async () => {
    const doc = await transformRepository(repo, context);
    expect(doc.content).toContain("Local Docker repository");
    expect(doc.content).toContain("Type: local");
    expect(doc.content).toContain("Package Type: docker");
    expect(doc.content).toContain("Environments: PROD, DEV");
  });

  it("handles repo without optional fields", async () => {
    const minimal: JFrogRepository = {
      key: "npm-remote",
      description: "",
      type: "remote",
      url: "https://mycompany.jfrog.io/artifactory/npm-remote",
      packageType: "npm",
    };

    const doc = await transformRepository(minimal, context);
    expect(doc.id).toBe("conn_jfrog_123_repository_npm-remote");
    expect(doc.metadata?.layoutRef).toBeUndefined();
    expect(doc.metadata?.environments).toBeUndefined();
  });
});

describe("transformArtifact", () => {
  const artifact: JFrogArtifact = {
    repo: "docker-local",
    path: "myapp/1.0.0",
    name: "manifest.json",
    type: "file",
    size: 1536,
    created: "2026-03-20T10:00:00Z",
    createdBy: "ci-bot",
    modified: "2026-03-20T10:05:00Z",
    modifiedBy: "ci-bot",
    updated: "2026-03-20T10:05:00Z",
    actualSha1: "abc123def456",
    sha256: "sha256_hash_value",
    mimeType: "application/json",
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformArtifact(artifact, context);

    expect(doc.connector_id).toBe("conn_jfrog_123");
    expect(doc.document_type).toBe("artifact");
    expect(doc.title).toBe("docker-local/myapp/1.0.0/manifest.json");
    expect(doc.source_type).toBe("jfrog");
    expect(doc.author_name).toBe("ci-bot");
    expect(doc.checksum).toBeDefined();
  });

  it("includes metadata fields", async () => {
    const doc = await transformArtifact(artifact, context);

    expect(doc.metadata).toMatchObject({
      repo: "docker-local",
      path: "myapp/1.0.0",
      fileName: "manifest.json",
      fileType: "file",
      size: 1536,
      sizeFormatted: "1.5 KB",
      mimeType: "application/json",
      createdBy: "ci-bot",
      sha1: "abc123def456",
      sha256: "sha256_hash_value",
    });
  });

  it("includes path info in content", async () => {
    const doc = await transformArtifact(artifact, context);
    expect(doc.content).toContain(
      "Path: docker-local/myapp/1.0.0/manifest.json"
    );
    expect(doc.content).toContain("Size: 1.5 KB");
    expect(doc.content).toContain("MIME: application/json");
    expect(doc.content).toContain("SHA256: sha256_hash_value");
  });

  it("handles root path artifact", async () => {
    const rootArtifact: JFrogArtifact = {
      repo: "generic-local",
      path: ".",
      name: "readme.txt",
      type: "file",
      size: 256,
      created: "2026-03-20T10:00:00Z",
      createdBy: "admin",
      modified: "2026-03-20T10:00:00Z",
      modifiedBy: "admin",
      updated: "2026-03-20T10:00:00Z",
    };

    const doc = await transformArtifact(rootArtifact, context);
    expect(doc.title).toBe("generic-local/readme.txt");
    expect(doc.external_id).toBe("generic-local/readme.txt");
  });
});

describe("transformBuild", () => {
  const build: JFrogBuild = {
    buildName: "myapp-release",
    buildNumber: "42",
    buildStarted: "2026-03-20T10:00:00Z",
    buildUri: "https://mycompany.jfrog.io/ui/builds/myapp-release/42",
    status: "released",
    durationMillis: 125_000,
    principal: "ci-user@example.com",
    buildAgent: { name: "gradle", version: "7.6" },
    agent: { name: "jfrog-cli", version: "2.50.0" },
    modules: [
      {
        id: "com.example:myapp:1.0.0",
        artifacts: [
          { name: "myapp-1.0.0.jar", type: "jar", sha1: "a", md5: "b" },
        ],
      },
    ],
    vcs: [
      {
        revision: "abc123",
        url: "https://github.com/example/myapp",
        branch: "main",
      },
    ],
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformBuild(build, context);

    expect(doc.document_type).toBe("build");
    expect(doc.title).toBe("myapp-release #42");
    expect(doc.source_type).toBe("jfrog");
    expect(doc.author_name).toBe("ci-user@example.com");
    expect(doc.checksum).toBeDefined();
  });

  it("includes metadata", async () => {
    const doc = await transformBuild(build, context);

    expect(doc.metadata).toMatchObject({
      buildName: "myapp-release",
      buildNumber: "42",
      status: "released",
      durationMs: 125_000,
      duration: "2m 5s",
      principal: "ci-user@example.com",
      buildAgent: "gradle 7.6",
      moduleCount: 1,
      modules: "com.example:myapp:1.0.0",
      vcsUrl: "https://github.com/example/myapp",
      vcsBranch: "main",
    });
  });

  it("includes build details in content", async () => {
    const doc = await transformBuild(build, context);
    expect(doc.content).toContain("Build: myapp-release #42");
    expect(doc.content).toContain("Status: released");
    expect(doc.content).toContain("Duration: 2m 5s");
    expect(doc.content).toContain("Triggered by: ci-user@example.com");
    expect(doc.content).toContain("Modules: com.example:myapp:1.0.0");
    expect(doc.content).toContain("Published artifacts: 1");
    expect(doc.content).toContain("Branch: main");
  });
});

describe("transformViolation", () => {
  const violation: JFrogViolation = {
    id: "violation-001",
    type: "security",
    severity: "High",
    description: "Remote code execution via deserialization",
    created: "2026-03-20T09:00:00Z",
    watchName: "prod-watch",
    issueId: "XRAY-12345",
    summary: "CVE-2026-1234: RCE in commons-collections",
    impactedArtifacts: [
      {
        name: "commons-collections-3.2.1.jar",
        displayName: "commons-collections:3.2.1",
        path: "libs-release/org/apache/commons/3.2.1/",
        pkgType: "maven",
        infectedFiles: [
          {
            name: "commons-collections-3.2.1.jar",
            path: "org/apache/commons/3.2.1/",
            sha256: "abc123",
          },
        ],
      },
    ],
    cve: ["CVE-2026-1234"],
    cvss_v3: "9.8",
    fixedVersions: ["3.2.3", "4.4.1"],
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2026-1234"],
    provider: "JFrog",
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformViolation(violation, context);

    expect(doc.id).toBe("conn_jfrog_123_violation_violation-001");
    expect(doc.document_type).toBe("violation");
    expect(doc.document_subtype).toBe("High");
    expect(doc.title).toBe("CVE-2026-1234: RCE in commons-collections");
    expect(doc.source_type).toBe("jfrog");
    expect(doc.checksum).toBeDefined();
  });

  it("includes metadata", async () => {
    const doc = await transformViolation(violation, context);

    expect(doc.metadata).toMatchObject({
      violationId: "violation-001",
      violationType: "security",
      severity: "High",
      severityLabel: "High",
      issueId: "XRAY-12345",
      watchName: "prod-watch",
      provider: "JFrog",
      cves: "CVE-2026-1234",
      cvssV3: "9.8",
      fixedVersions: "3.2.3, 4.4.1",
      impactedArtifactCount: 1,
      impactedArtifacts: "commons-collections:3.2.1",
    });
  });

  it("includes vulnerability details in content", async () => {
    const doc = await transformViolation(violation, context);
    expect(doc.content).toContain("CVE-2026-1234: RCE in commons-collections");
    expect(doc.content).toContain("Remote code execution via deserialization");
    expect(doc.content).toContain("Severity: High");
    expect(doc.content).toContain("CVEs: CVE-2026-1234");
    expect(doc.content).toContain("CVSS v3: 9.8");
    expect(doc.content).toContain("Fixed in: 3.2.3, 4.4.1");
    expect(doc.content).toContain("Impacted: commons-collections:3.2.1");
  });

  it("handles violation without summary", async () => {
    const noSummary: JFrogViolation = {
      id: "violation-002",
      type: "license",
      severity: "Medium",
      description: "GPL-3.0 license detected in production dependency tree",
      created: "2026-03-20T10:00:00Z",
      impactedArtifacts: [],
    };

    const doc = await transformViolation(noSummary, context);
    expect(doc.title).toBe(
      "GPL-3.0 license detected in production dependency tree"
    );
    expect(doc.metadata?.impactedArtifactCount).toBe(0);
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(5_242_880)).toBe("5.0 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(2_147_483_648)).toBe("2.00 GB");
  });
});

describe("formatDuration", () => {
  it("formats milliseconds", () => {
    expect(formatDuration(500)).toBe("500ms");
  });

  it("formats seconds", () => {
    expect(formatDuration(45_000)).toBe("45s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(125_000)).toBe("2m 5s");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(7_380_000)).toBe("2h 3m");
  });
});

describe("formatSeverity", () => {
  it("maps severity levels", () => {
    expect(formatSeverity("Critical")).toBe("Critical");
    expect(formatSeverity("High")).toBe("High");
    expect(formatSeverity("Medium")).toBe("Medium");
    expect(formatSeverity("Low")).toBe("Low");
    expect(formatSeverity("Information")).toBe("Informational");
  });

  it("returns unknown values as-is", () => {
    expect(formatSeverity("Custom")).toBe("Custom");
  });
});
