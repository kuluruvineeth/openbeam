import { describe, expect, it } from "bun:test";
import type { PhabricatorTransformContext } from "@openbeam/types/services/connectors/phabricator";
import { transformProject } from "../transformers/project";
import { transformRepository } from "../transformers/repository";
import { transformRevision } from "../transformers/revision";
import { transformTask } from "../transformers/task";
import { remarkupToPlainText } from "../transformers/utils";
import { transformWikiPage } from "../transformers/wiki-page";

const CONTEXT: PhabricatorTransformContext = {
  connectorId: "conn_phab_1",
  connectorType: "PHABRICATOR",
  teamId: "team_1",
  workspaceId: "ws_1",
  instanceUrl: "https://phab.example.com",
};

describe("remarkupToPlainText", () => {
  it("strips remarkup formatting", () => {
    const input = "**bold** //italic// `code` [[link|text]]";
    const result = remarkupToPlainText(input);
    expect(result).toContain("bold");
    expect(result).toContain("italic");
    expect(result).toContain("text");
    expect(result).not.toContain("**");
    expect(result).not.toContain("[[");
  });

  it("handles empty strings", () => {
    expect(remarkupToPlainText("")).toBe("");
  });
});

describe("transformTask", () => {
  it("transforms a basic task", async () => {
    const task = {
      id: 123,
      type: "TASK",
      phid: "PHID-TASK-abc",
      fields: {
        name: "Fix login bug",
        description: { raw: "Users cannot log in after password reset" },
        authorPHID: "PHID-USER-1",
        ownerPHID: "PHID-USER-2",
        status: { value: "open", name: "Open", color: null },
        priority: { value: 80, name: "High", color: "red" },
        points: 5,
        subtype: "default",
        spacePHID: null,
        dateCreated: 1_700_000_000,
        dateModified: 1_700_100_000,
        policy: { view: "public", interact: "users", edit: "users" },
      },
      attachments: {
        projects: { projectPHIDs: ["PHID-PROJ-1", "PHID-PROJ-2"] },
      },
    };

    const doc = await transformTask(task, CONTEXT);

    expect(doc.id).toBe("conn_phab_1_task_123");
    expect(doc.document_type).toBe("task");
    expect(doc.title).toBe("Fix login bug");
    expect(doc.content).toContain("Users cannot log in after password reset");
    expect(doc.content).toContain("Status: Open");
    expect(doc.content).toContain("Priority: High");
    expect(doc.content).toContain("Points: 5");
    expect(doc.url).toBe("https://phab.example.com/T123");
    expect(doc.metadata?.status).toBe("Open");
    expect(doc.metadata?.priorityValue).toBe("80");
    expect(doc.metadata?.points).toBe("5");
    expect(doc.created_at).toBe(1_700_000_000_000);
    expect(doc.updated_at).toBe(1_700_100_000_000);
  });

  it("handles task without owner or points", async () => {
    const task = {
      id: 456,
      type: "TASK",
      phid: "PHID-TASK-def",
      fields: {
        name: "Cleanup docs",
        description: { raw: "" },
        authorPHID: "PHID-USER-1",
        ownerPHID: null,
        status: { value: "resolved", name: "Resolved", color: null },
        priority: { value: 50, name: "Normal", color: "orange" },
        points: null,
        subtype: "default",
        spacePHID: null,
        dateCreated: 1_700_000_000,
        dateModified: 1_700_200_000,
        policy: { view: "public", interact: "users", edit: "users" },
      },
      attachments: { projects: { projectPHIDs: [] } },
    };

    const doc = await transformTask(task, CONTEXT);

    expect(doc.id).toBe("conn_phab_1_task_456");
    expect(doc.content).not.toContain("Points:");
    expect(doc.metadata?.points).toBeUndefined();
  });
});

describe("transformRevision", () => {
  it("transforms a code review", async () => {
    const revision = {
      id: 42,
      type: "DREV",
      phid: "PHID-DREV-abc",
      fields: {
        title: "Add OAuth2 support",
        uri: "https://phab.example.com/D42",
        authorPHID: "PHID-USER-1",
        status: {
          value: "accepted",
          name: "Accepted",
          closed: false,
          "color.ansi": "green",
        },
        repositoryPHID: "PHID-REPO-1",
        diffPHID: "PHID-DIFF-1",
        summary: "Implements OAuth2 authorization code flow",
        testPlan: "Run unit tests and manual QA",
        isDraft: false,
        holdAsDraft: false,
        dateCreated: 1_700_000_000,
        dateModified: 1_700_050_000,
        policy: { view: "public", edit: "users" },
      },
      attachments: {
        reviewers: {
          reviewers: [
            {
              reviewerPHID: "PHID-USER-2",
              status: "accepted",
              isBlocking: false,
            },
            { reviewerPHID: "PHID-USER-3", status: "added", isBlocking: true },
          ],
        },
      },
    };

    const doc = await transformRevision(revision, CONTEXT);

    expect(doc.id).toBe("conn_phab_1_revision_42");
    expect(doc.document_type).toBe("revision");
    expect(doc.title).toBe("Add OAuth2 support");
    expect(doc.content).toContain("OAuth2 authorization code flow");
    expect(doc.content).toContain("Test Plan: Run unit tests");
    expect(doc.content).toContain("Reviewers: 2");
    expect(doc.url).toBe("https://phab.example.com/D42");
    expect(doc.metadata?.reviewerCount).toBe("2");
    expect(doc.metadata?.repositoryPhid).toBe("PHID-REPO-1");
  });
});

describe("transformWikiPage", () => {
  it("transforms a wiki page", async () => {
    const page = {
      id: 10,
      type: "WIKI",
      phid: "PHID-WIKI-abc",
      fields: {
        path: "/engineering/onboarding/",
        status: { value: "active", name: "Active" },
        dateCreated: 1_700_000_000,
        dateModified: 1_700_300_000,
        policy: { view: "public", edit: "users" },
      },
      attachments: {
        content: {
          content: { raw: "Welcome to the engineering team" },
          title: "Engineering Onboarding",
          authorPHID: "PHID-USER-1",
        },
      },
    };

    const doc = await transformWikiPage(page, CONTEXT);

    expect(doc.id).toBe("conn_phab_1_wiki_10");
    expect(doc.document_type).toBe("wiki_page");
    expect(doc.title).toBe("Engineering Onboarding");
    expect(doc.content).toContain("Welcome to the engineering team");
    expect(doc.content).toContain("Path: /engineering/onboarding/");
    expect(doc.url).toBe("https://phab.example.com/w/engineering/onboarding/");
  });
});

describe("transformRepository", () => {
  it("transforms a git repository", async () => {
    const repo = {
      id: 5,
      type: "REPO",
      phid: "PHID-REPO-abc",
      fields: {
        name: "backend-api",
        vcs: "git",
        callsign: "BAK",
        shortName: "backend-api",
        status: "active",
        isImporting: false,
        spacePHID: null,
        dateCreated: 1_700_000_000,
        dateModified: 1_700_400_000,
        policy: { view: "public", edit: "users", diffusion: { push: "users" } },
      },
      attachments: {
        uris: {
          uris: [
            {
              id: "1",
              type: "RURI",
              phid: "PHID-RURI-1",
              fields: {
                uri: {
                  raw: "ssh://git@phab.example.com/diffusion/BAK/backend-api.git",
                  display:
                    "ssh://git@phab.example.com/diffusion/BAK/backend-api.git",
                  effective:
                    "ssh://git@phab.example.com/diffusion/BAK/backend-api.git",
                  normalized: "phab.example.com/diffusion/BAK",
                },
                io: {
                  raw: "default",
                  default: "readwrite",
                  effective: "readwrite",
                },
                display: {
                  raw: "default",
                  default: "always",
                  effective: "always",
                },
              },
            },
          ],
        },
      },
    };

    const doc = await transformRepository(repo, CONTEXT);

    expect(doc.id).toBe("conn_phab_1_repo_5");
    expect(doc.document_type).toBe("repository");
    expect(doc.title).toBe("backend-api");
    expect(doc.content).toContain("VCS: git");
    expect(doc.content).toContain("Callsign: BAK");
    expect(doc.content).toContain("Clone URI:");
    expect(doc.url).toBe("https://phab.example.com/diffusion/BAK/");
    expect(doc.metadata?.vcs).toBe("git");
    expect(doc.metadata?.callsign).toBe("BAK");
  });
});

describe("transformProject", () => {
  it("transforms a project", async () => {
    const project = {
      id: 7,
      type: "PROJ",
      phid: "PHID-PROJ-abc",
      fields: {
        name: "Backend Team",
        slug: "backend-team",
        description: { raw: "Core backend engineering team" },
        subtype: "default",
        milestone: null,
        depth: 0,
        parent: null,
        icon: { key: "group", name: "Group", icon: "fa-users" },
        color: { key: "blue", name: "Blue" },
        spacePHID: null,
        dateCreated: 1_700_000_000,
        dateModified: 1_700_500_000,
        policy: { view: "public", edit: "users", join: "users" },
      },
      attachments: {
        members: {
          members: [
            { phid: "PHID-USER-1" },
            { phid: "PHID-USER-2" },
            { phid: "PHID-USER-3" },
          ],
        },
      },
    };

    const doc = await transformProject(project, CONTEXT);

    expect(doc.id).toBe("conn_phab_1_project_7");
    expect(doc.document_type).toBe("project");
    expect(doc.title).toBe("Backend Team");
    expect(doc.content).toContain("Core backend engineering team");
    expect(doc.content).toContain("Members: 3");
    expect(doc.content).toContain("Icon: Group");
    expect(doc.url).toBe("https://phab.example.com/project/view/backend-team/");
    expect(doc.metadata?.memberCount).toBe("3");
    expect(doc.metadata?.slug).toBe("backend-team");
  });
});
