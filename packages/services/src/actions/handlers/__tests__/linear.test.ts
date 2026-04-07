import { beforeEach, describe, expect, it, mock } from "bun:test";

type IssueResult = {
  success: boolean;
  id?: string;
  identifier?: string;
  url?: string;
  error?: string;
};

const createIssueMock = mock(
  (): Promise<IssueResult> =>
    Promise.resolve({
      success: true,
      id: "iss1",
      identifier: "ENG-1",
      url: "https://linear.app/iss1",
    })
);
const updateIssueMock = mock(() => Promise.resolve({ success: true }));
const searchIssuesMock = mock(() =>
  Promise.resolve({
    success: true,
    issues: [{ id: "iss1", title: "Bug" }],
    totalCount: 1,
  })
);
const addCommentMock = mock(() =>
  Promise.resolve({ success: true, id: "com1" })
);
const addLabelMock = mock(() => Promise.resolve({ success: true }));
const getProjectMock = mock(() =>
  Promise.resolve({ success: true, project: { id: "proj1", name: "Alpha" } })
);
const createProjectMock = mock(() =>
  Promise.resolve({
    success: true,
    id: "proj2",
    url: "https://linear.app/proj2",
  })
);
const getCycleMock = mock(() =>
  Promise.resolve({ success: true, cycle: { id: "cyc1", name: "Sprint 1" } })
);
const addIssueToCycleMock = mock(() => Promise.resolve({ success: true }));
const listTeamsMock = mock(() =>
  Promise.resolve({ success: true, teams: [{ id: "T1", name: "Eng" }] })
);

mock.module("../../../linear/actions", () => ({
  createIssue: createIssueMock,
  updateIssue: updateIssueMock,
  searchIssues: searchIssuesMock,
  addComment: addCommentMock,
  addLabel: addLabelMock,
  getProject: getProjectMock,
  createProject: createProjectMock,
  getCycle: getCycleMock,
  addIssueToCycle: addIssueToCycleMock,
  listTeams: listTeamsMock,
}));

mock.module("../../../linear/client", () => ({
  createLinearClient: () => ({}),
}));

import { getHandler } from "../../handler-registry";
import "../linear";

const handler = getHandler("linear");

const credentials = { accessToken: "lin_token", config: {} };

function run(actionId: string, params: Record<string, unknown>) {
  if (!handler) {
    throw new Error("linear handler not registered");
  }
  return handler.execute(actionId, params, credentials, "conn_1");
}

const allMocks = [
  createIssueMock,
  updateIssueMock,
  searchIssuesMock,
  addCommentMock,
  addLabelMock,
  getProjectMock,
  createProjectMock,
  getCycleMock,
  addIssueToCycleMock,
  listTeamsMock,
];

describe("linear handler", () => {
  beforeEach(() => {
    for (const m of allMocks) {
      m.mockClear();
    }
  });

  it("registers with 11 actions", () => {
    expect(handler).toBeDefined();
    expect(handler?.supportedActions).toHaveLength(11);
  });

  it("rejects unknown action", async () => {
    const r = await run("nonexistent", {});
    expect(r.success).toBe(false);
    expect(r.error).toContain("Unsupported Linear");
  });

  describe("issue_create", () => {
    it("creates an issue with required fields", async () => {
      const r = await run("issue_create", {
        title: "Bug fix",
        teamId: "T1",
      });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({
        id: "iss1",
        identifier: "ENG-1",
        url: "https://linear.app/iss1",
      });
    });

    it("passes optional fields", async () => {
      await run("issue_create", {
        title: "X",
        teamId: "T1",
        description: "desc",
        priority: 2,
        assigneeId: "u1",
      });
      expect(createIssueMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          description: "desc",
          priority: 2,
          assigneeId: "u1",
        })
      );
    });

    it("propagates failure", async () => {
      createIssueMock.mockImplementationOnce(() =>
        Promise.resolve({ success: false, error: "team not found" })
      );
      const r = await run("issue_create", { title: "X", teamId: "T_BAD" });
      expect(r.success).toBe(false);
      expect(r.error).toBe("team not found");
    });
  });

  describe("issue_update", () => {
    it("updates an issue", async () => {
      const r = await run("issue_update", {
        issueId: "iss1",
        title: "New title",
      });
      expect(r.success).toBe(true);
    });
  });

  describe("issue_search", () => {
    it("searches issues", async () => {
      const r = await run("issue_search", { query: "bug" });
      expect(r.success).toBe(true);
      expect(r.data).toMatchObject({ issues: [{ id: "iss1" }], totalCount: 1 });
    });
  });

  describe("issue_assign", () => {
    it("assigns a user to an issue", async () => {
      const r = await run("issue_assign", {
        issueId: "iss1",
        assigneeId: "u2",
      });
      expect(r.success).toBe(true);
      expect(updateIssueMock).toHaveBeenCalledWith(expect.anything(), "iss1", {
        assigneeId: "u2",
      });
    });
  });

  describe("issue_add_comment", () => {
    it("adds a comment", async () => {
      const r = await run("issue_add_comment", {
        issueId: "iss1",
        body: "looks good",
      });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ id: "com1" });
    });
  });

  describe("issue_add_label", () => {
    it("adds a label", async () => {
      const r = await run("issue_add_label", {
        issueId: "iss1",
        labelId: "lbl1",
      });
      expect(r.success).toBe(true);
    });
  });

  describe("project_get", () => {
    it("returns project details", async () => {
      const r = await run("project_get", { projectId: "proj1" });
      expect(r.success).toBe(true);
      expect(r.data.project).toMatchObject({ id: "proj1", name: "Alpha" });
    });
  });

  describe("project_create", () => {
    it("creates a project", async () => {
      const r = await run("project_create", {
        name: "Beta",
        teamIds: ["T1"],
      });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({
        id: "proj2",
        url: "https://linear.app/proj2",
      });
    });

    it("rejects empty teamIds", async () => {
      const r = await run("project_create", {
        name: "X",
        teamIds: [],
      });
      expect(r.success).toBe(false);
      expect(r.error).toBe("teamIds is required");
    });

    it("rejects missing teamIds", async () => {
      const r = await run("project_create", { name: "X" });
      expect(r.success).toBe(false);
    });
  });

  describe("cycle_get", () => {
    it("returns cycle details", async () => {
      const r = await run("cycle_get", { cycleId: "cyc1" });
      expect(r.success).toBe(true);
      expect(r.data.cycle).toMatchObject({ id: "cyc1" });
    });
  });

  describe("cycle_add_issue", () => {
    it("adds an issue to a cycle", async () => {
      const r = await run("cycle_add_issue", {
        issueId: "iss1",
        cycleId: "cyc1",
      });
      expect(r.success).toBe(true);
    });
  });

  describe("team_list", () => {
    it("lists teams", async () => {
      const r = await run("team_list", {});
      expect(r.success).toBe(true);
      expect(r.data.teams).toHaveLength(1);
    });
  });
});
