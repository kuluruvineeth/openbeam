import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const controlIssueListTool = defineTool({
  name: "control_issue_list",
  description: `List control plane issues (tasks/problems) for the team.

USE THIS WHEN:
- Need to find open issues or tasks
- Looking for work to do or problems to investigate

RETURNS: Array of issues with id, title, status, priority, assignee.`,
  category: "control",
  parameters: z.object({
    status: z
      .enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"])
      .optional()
      .describe("Filter by status"),
    priority: z
      .enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"])
      .optional()
      .describe("Filter by priority"),
    assigneeAgentId: z.string().optional().describe("Filter by assigned agent"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .describe("Max results"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const result = await ctx.services.controlIssues?.list({
      teamId: ctx.teamId,
      ...params,
    });
    return success({ issues: result });
  },
});

export const controlIssueCreateTool = defineTool({
  name: "control_issue_create",
  description: `Create a new control plane issue.

USE THIS WHEN:
- Discovered a problem that needs tracking
- Need to create a task for another agent

DO NOT USE WHEN:
- Issue already exists (check with control_issue_list first)

RETURNS: The created issue with its ID.`,
  category: "control",
  stakes: "medium",
  parameters: z.object({
    title: z.string().min(1).max(200).describe("Issue title"),
    description: z.string().optional().describe("Detailed description"),
    priority: z
      .enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"])
      .optional()
      .default("MEDIUM")
      .describe("Issue priority"),
    projectId: z.string().optional().describe("Project to associate with"),
    labels: z.array(z.string()).optional().describe("Labels to apply"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const issue = await ctx.services.controlIssues?.create({
      teamId: ctx.teamId,
      ...params,
    });
    return success(issue);
  },
});

export const controlIssueUpdateTool = defineTool({
  name: "control_issue_update",
  description: `Update an existing control plane issue.

USE THIS WHEN:
- Changing status, priority, or assignment of an issue
- Adding resolution details

RETURNS: The updated issue.`,
  category: "control",
  stakes: "medium",
  parameters: z.object({
    issueId: z.string().describe("Issue ID to update"),
    status: z
      .enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"])
      .optional()
      .describe("New status"),
    priority: z
      .enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"])
      .optional()
      .describe("New priority"),
    assigneeAgentId: z.string().optional().describe("Assign to agent"),
    resolution: z.string().optional().describe("Resolution details"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const { issueId, ...data } = params;
    const issue = await ctx.services.controlIssues?.update({
      teamId: ctx.teamId,
      issueId,
      ...data,
    });
    if (!issue) {
      return failure("NOT_FOUND", `Issue ${issueId} not found`);
    }
    return success(issue);
  },
});

export const controlIssueCommentTool = defineTool({
  name: "control_issue_comment",
  description: `Add a comment to a control plane issue.

USE THIS WHEN:
- Reporting progress on an issue
- Adding investigation findings
- Communicating with other agents about an issue

RETURNS: The created comment.`,
  category: "control",
  parameters: z.object({
    issueId: z.string().describe("Issue ID to comment on"),
    body: z.string().min(1).describe("Comment text"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const comment = await ctx.services.controlIssues?.comment({
      teamId: ctx.teamId,
      issueId: params.issueId,
      body: params.body,
    });
    return success(comment);
  },
});

export const controlIssueCheckoutTool = defineTool({
  name: "control_issue_checkout",
  description: `Checkout (claim) an issue for the current agent to work on.

USE THIS WHEN:
- Agent wants to start working on an issue
- Need exclusive claim to prevent duplicate work

DO NOT USE WHEN:
- Issue is already assigned to another agent
- Issue is resolved or closed

RETURNS: Whether checkout succeeded.`,
  category: "control",
  stakes: "medium",
  parameters: z.object({
    issueId: z.string().describe("Issue ID to checkout"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const result = await ctx.services.controlIssues?.checkout({
      teamId: ctx.teamId,
      issueId: params.issueId,
    });
    return success(result);
  },
});

export function registerIssueTools() {
  controlIssueListTool.register();
  controlIssueCreateTool.register();
  controlIssueUpdateTool.register();
  controlIssueCommentTool.register();
  controlIssueCheckoutTool.register();
}
