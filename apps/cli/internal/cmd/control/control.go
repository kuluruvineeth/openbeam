package control

import (
	"encoding/json"
	"net/url"

	"github.com/spf13/cobra"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/api"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/shared"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/output"
)

const basePath = "/api/v1/agent-control"

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "control",
		Short: "Agent control plane",
	}
	cmd.AddCommand(newAgentsCommand(provider))
	cmd.AddCommand(newIssuesCommand(provider))
	cmd.AddCommand(newProjectsCommand(provider))
	cmd.AddCommand(newGoalsCommand(provider))
	cmd.AddCommand(newApprovalsCommand(provider))
	cmd.AddCommand(newCostsCommand(provider))
	cmd.AddCommand(newActivityCommand(provider))
	cmd.AddCommand(newRunsCommand(provider))
	cmd.AddCommand(newDashboardCommand(provider))
	return cmd
}

// ---------------------------------------------------------------------------
// agents
// ---------------------------------------------------------------------------

func newAgentsCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "agents",
		Short: "Agent management",
	}
	cmd.AddCommand(newAgentsListCommand(provider))
	cmd.AddCommand(newAgentsGetCommand(provider))
	cmd.AddCommand(newAgentsCreateCommand(provider))
	cmd.AddCommand(newAgentsWakeCommand(provider))
	cmd.AddCommand(newAgentsPauseCommand(provider))
	cmd.AddCommand(newAgentsTerminateCommand(provider))
	return cmd
}

func newAgentsListCommand(provider shared.RuntimeProvider) *cobra.Command {
	var status string
	var limit int
	var offset int
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List agents",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"status": status,
				"limit":  shared.IntToString(limit),
				"offset": shared.IntToString(offset),
			})
			return shared.GetAndRender(cmd.Context(), provider, "control agents list", shared.Path(basePath, "agents"), query, true)
		},
	}
	cmd.Flags().StringVar(&status, "status", "", "Filter by agent status")
	cmd.Flags().IntVar(&limit, "limit", 20, "Page size")
	cmd.Flags().IntVar(&offset, "offset", 0, "Pagination offset")
	return cmd
}

func newAgentsGetCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	cmd := &cobra.Command{
		Use:   "get",
		Short: "Get agent details",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path(basePath, "agents", agentID)
			return shared.GetAndRender(cmd.Context(), provider, "control agents get", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "id", "", "Agent identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newAgentsCreateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var name string
	var role string
	var adapterType string
	var configJSON string
	cmd := &cobra.Command{
		Use:   "create",
		Short: "Register a new agent",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{
				"name":        name,
				"role":        role,
				"adapterType": adapterType,
			}
			if cmd.Flags().Changed("config") {
				config, err := shared.ParseJSONObject(configJSON)
				if err != nil {
					return errs.New(errs.KindUsage, "invalid --config JSON", err)
				}
				body["config"] = config
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "control agents create", shared.Path(basePath, "agents"), nil, body, true)
		},
	}
	cmd.Flags().StringVar(&name, "name", "", "Agent name")
	cmd.Flags().StringVar(&role, "role", "", "Agent role")
	cmd.Flags().StringVar(&adapterType, "adapter-type", "", "Adapter type")
	cmd.Flags().StringVar(&configJSON, "config", "{}", "Agent config JSON")
	_ = cmd.MarkFlagRequired("name")
	_ = cmd.MarkFlagRequired("role")
	_ = cmd.MarkFlagRequired("adapter-type")
	return cmd
}

func newAgentsWakeCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	var reason string
	cmd := &cobra.Command{
		Use:   "wake",
		Short: "Wake an agent",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{}
			if reason != "" {
				body["reason"] = reason
			}
			path := shared.Path(basePath, "agents", agentID, "wake")
			return shared.PostAndRender(cmd.Context(), provider, "control agents wake", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "id", "", "Agent identifier")
	cmd.Flags().StringVar(&reason, "reason", "", "Wake reason")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newAgentsPauseCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	cmd := &cobra.Command{
		Use:   "pause",
		Short: "Pause an agent",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path(basePath, "agents", agentID, "pause")
			return shared.PostMutationAndRender(cmd.Context(), provider, "control agents pause", path, nil, map[string]any{}, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "id", "", "Agent identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newAgentsTerminateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	cmd := &cobra.Command{
		Use:   "terminate",
		Short: "Terminate an agent",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path(basePath, "agents", agentID, "terminate")
			return shared.PostMutationAndRender(cmd.Context(), provider, "control agents terminate", path, nil, map[string]any{}, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "id", "", "Agent identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

// ---------------------------------------------------------------------------
// issues
// ---------------------------------------------------------------------------

func newIssuesCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "issues",
		Short: "Issue management",
	}
	cmd.AddCommand(newIssuesListCommand(provider))
	cmd.AddCommand(newIssuesGetCommand(provider))
	cmd.AddCommand(newIssuesCreateCommand(provider))
	cmd.AddCommand(newIssuesUpdateCommand(provider))
	cmd.AddCommand(newIssuesCommentCommand(provider))
	cmd.AddCommand(newIssuesCheckoutCommand(provider))
	cmd.AddCommand(newIssuesReleaseCommand(provider))
	return cmd
}

func newIssuesListCommand(provider shared.RuntimeProvider) *cobra.Command {
	var status string
	var assignee string
	var project string
	var limit int
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List issues",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"status":   status,
				"assignee": assignee,
				"project":  project,
				"limit":    shared.IntToString(limit),
			})
			return shared.GetAndRender(cmd.Context(), provider, "control issues list", shared.Path(basePath, "issues"), query, true)
		},
	}
	cmd.Flags().StringVar(&status, "status", "", "Filter by status")
	cmd.Flags().StringVar(&assignee, "assignee", "", "Filter by assignee")
	cmd.Flags().StringVar(&project, "project", "", "Filter by project")
	cmd.Flags().IntVar(&limit, "limit", 20, "Page size")
	return cmd
}

func newIssuesGetCommand(provider shared.RuntimeProvider) *cobra.Command {
	var issueID string
	cmd := &cobra.Command{
		Use:   "get",
		Short: "Get issue details",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path(basePath, "issues", issueID)
			return shared.GetAndRender(cmd.Context(), provider, "control issues get", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&issueID, "id", "", "Issue identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newIssuesCreateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var title string
	var description string
	var priority string
	var assignee string
	var project string
	cmd := &cobra.Command{
		Use:   "create",
		Short: "Create an issue",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{"title": title}
			if description != "" {
				body["description"] = description
			}
			if priority != "" {
				body["priority"] = priority
			}
			if assignee != "" {
				body["assignee"] = assignee
			}
			if project != "" {
				body["project"] = project
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "control issues create", shared.Path(basePath, "issues"), nil, body, true)
		},
	}
	cmd.Flags().StringVar(&title, "title", "", "Issue title")
	cmd.Flags().StringVar(&description, "description", "", "Issue description")
	cmd.Flags().StringVar(&priority, "priority", "", "Issue priority")
	cmd.Flags().StringVar(&assignee, "assignee", "", "Assignee agent ID")
	cmd.Flags().StringVar(&project, "project", "", "Project ID")
	_ = cmd.MarkFlagRequired("title")
	return cmd
}

func newIssuesUpdateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var issueID string
	var status string
	var title string
	var assignee string
	cmd := &cobra.Command{
		Use:   "update",
		Short: "Update an issue",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{}
			if status != "" {
				body["status"] = status
			}
			if title != "" {
				body["title"] = title
			}
			if assignee != "" {
				body["assignee"] = assignee
			}
			path := shared.Path(basePath, "issues", issueID)
			return shared.PatchMutationAndRender(cmd.Context(), provider, "control issues update", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&issueID, "id", "", "Issue identifier")
	cmd.Flags().StringVar(&status, "status", "", "New status")
	cmd.Flags().StringVar(&title, "title", "", "New title")
	cmd.Flags().StringVar(&assignee, "assignee", "", "New assignee")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newIssuesCommentCommand(provider shared.RuntimeProvider) *cobra.Command {
	var issueID string
	var body string
	cmd := &cobra.Command{
		Use:   "comment",
		Short: "Add comment to issue",
		RunE: func(cmd *cobra.Command, args []string) error {
			payload := map[string]any{"body": body}
			path := shared.Path(basePath, "issues", issueID, "comments")
			return shared.PostAndRender(cmd.Context(), provider, "control issues comment", path, nil, payload, true)
		},
	}
	cmd.Flags().StringVar(&issueID, "id", "", "Issue identifier")
	cmd.Flags().StringVar(&body, "body", "", "Comment body")
	_ = cmd.MarkFlagRequired("id")
	_ = cmd.MarkFlagRequired("body")
	return cmd
}

func newIssuesCheckoutCommand(provider shared.RuntimeProvider) *cobra.Command {
	var issueID string
	var agentID string
	cmd := &cobra.Command{
		Use:   "checkout",
		Short: "Assign issue to agent",
		RunE: func(cmd *cobra.Command, args []string) error {
			payload := map[string]any{"agentId": agentID}
			path := shared.Path(basePath, "issues", issueID, "checkout")
			return shared.PostMutationAndRender(cmd.Context(), provider, "control issues checkout", path, nil, payload, true)
		},
	}
	cmd.Flags().StringVar(&issueID, "id", "", "Issue identifier")
	cmd.Flags().StringVar(&agentID, "agent-id", "", "Agent identifier")
	_ = cmd.MarkFlagRequired("id")
	_ = cmd.MarkFlagRequired("agent-id")
	return cmd
}

func newIssuesReleaseCommand(provider shared.RuntimeProvider) *cobra.Command {
	var issueID string
	cmd := &cobra.Command{
		Use:   "release",
		Short: "Release issue from agent",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path(basePath, "issues", issueID, "release")
			return shared.PostMutationAndRender(cmd.Context(), provider, "control issues release", path, nil, map[string]any{}, true)
		},
	}
	cmd.Flags().StringVar(&issueID, "id", "", "Issue identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------

func newProjectsCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "projects",
		Short: "Project management",
	}
	cmd.AddCommand(newProjectsListCommand(provider))
	cmd.AddCommand(newProjectsGetCommand(provider))
	cmd.AddCommand(newProjectsCreateCommand(provider))
	cmd.AddCommand(newProjectsUpdateCommand(provider))
	cmd.AddCommand(newProjectsDeleteCommand(provider))
	return cmd
}

func newProjectsListCommand(provider shared.RuntimeProvider) *cobra.Command {
	var limit int
	var offset int
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List projects",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"limit":  shared.IntToString(limit),
				"offset": shared.IntToString(offset),
			})
			return shared.GetAndRender(cmd.Context(), provider, "control projects list", shared.Path(basePath, "projects"), query, true)
		},
	}
	cmd.Flags().IntVar(&limit, "limit", 20, "Page size")
	cmd.Flags().IntVar(&offset, "offset", 0, "Pagination offset")
	return cmd
}

func newProjectsGetCommand(provider shared.RuntimeProvider) *cobra.Command {
	var projectID string
	cmd := &cobra.Command{
		Use:   "get",
		Short: "Get project details",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path(basePath, "projects", projectID)
			return shared.GetAndRender(cmd.Context(), provider, "control projects get", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&projectID, "id", "", "Project identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newProjectsCreateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var name string
	var description string
	cmd := &cobra.Command{
		Use:   "create",
		Short: "Create a project",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{"name": name}
			if description != "" {
				body["description"] = description
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "control projects create", shared.Path(basePath, "projects"), nil, body, true)
		},
	}
	cmd.Flags().StringVar(&name, "name", "", "Project name")
	cmd.Flags().StringVar(&description, "description", "", "Project description")
	_ = cmd.MarkFlagRequired("name")
	return cmd
}

func newProjectsUpdateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var projectID string
	var name string
	var description string
	cmd := &cobra.Command{
		Use:   "update",
		Short: "Update a project",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{}
			if name != "" {
				body["name"] = name
			}
			if description != "" {
				body["description"] = description
			}
			path := shared.Path(basePath, "projects", projectID)
			return shared.PatchMutationAndRender(cmd.Context(), provider, "control projects update", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&projectID, "id", "", "Project identifier")
	cmd.Flags().StringVar(&name, "name", "", "New name")
	cmd.Flags().StringVar(&description, "description", "", "New description")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newProjectsDeleteCommand(provider shared.RuntimeProvider) *cobra.Command {
	var projectID string
	cmd := &cobra.Command{
		Use:   "delete",
		Short: "Delete a project",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path(basePath, "projects", projectID)
			return shared.DeleteMutationAndRender(cmd.Context(), provider, "control projects delete", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&projectID, "id", "", "Project identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

// ---------------------------------------------------------------------------
// goals
// ---------------------------------------------------------------------------

func newGoalsCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "goals",
		Short: "Goal management",
	}
	cmd.AddCommand(newGoalsListCommand(provider))
	cmd.AddCommand(newGoalsGetCommand(provider))
	cmd.AddCommand(newGoalsCreateCommand(provider))
	cmd.AddCommand(newGoalsUpdateCommand(provider))
	cmd.AddCommand(newGoalsDeleteCommand(provider))
	return cmd
}

func newGoalsListCommand(provider shared.RuntimeProvider) *cobra.Command {
	var limit int
	var offset int
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List goals",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"limit":  shared.IntToString(limit),
				"offset": shared.IntToString(offset),
			})
			return shared.GetAndRender(cmd.Context(), provider, "control goals list", shared.Path(basePath, "goals"), query, true)
		},
	}
	cmd.Flags().IntVar(&limit, "limit", 20, "Page size")
	cmd.Flags().IntVar(&offset, "offset", 0, "Pagination offset")
	return cmd
}

func newGoalsGetCommand(provider shared.RuntimeProvider) *cobra.Command {
	var goalID string
	cmd := &cobra.Command{
		Use:   "get",
		Short: "Get goal details",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path(basePath, "goals", goalID)
			return shared.GetAndRender(cmd.Context(), provider, "control goals get", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&goalID, "id", "", "Goal identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newGoalsCreateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var name string
	var description string
	cmd := &cobra.Command{
		Use:   "create",
		Short: "Create a goal",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{"name": name}
			if description != "" {
				body["description"] = description
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "control goals create", shared.Path(basePath, "goals"), nil, body, true)
		},
	}
	cmd.Flags().StringVar(&name, "name", "", "Goal name")
	cmd.Flags().StringVar(&description, "description", "", "Goal description")
	_ = cmd.MarkFlagRequired("name")
	return cmd
}

func newGoalsUpdateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var goalID string
	var name string
	var description string
	cmd := &cobra.Command{
		Use:   "update",
		Short: "Update a goal",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{}
			if name != "" {
				body["name"] = name
			}
			if description != "" {
				body["description"] = description
			}
			path := shared.Path(basePath, "goals", goalID)
			return shared.PatchMutationAndRender(cmd.Context(), provider, "control goals update", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&goalID, "id", "", "Goal identifier")
	cmd.Flags().StringVar(&name, "name", "", "New name")
	cmd.Flags().StringVar(&description, "description", "", "New description")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newGoalsDeleteCommand(provider shared.RuntimeProvider) *cobra.Command {
	var goalID string
	cmd := &cobra.Command{
		Use:   "delete",
		Short: "Delete a goal",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path(basePath, "goals", goalID)
			return shared.DeleteMutationAndRender(cmd.Context(), provider, "control goals delete", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&goalID, "id", "", "Goal identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

// ---------------------------------------------------------------------------
// approvals
// ---------------------------------------------------------------------------

func newApprovalsCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "approvals",
		Short: "Approval workflows",
	}
	cmd.AddCommand(newApprovalsListCommand(provider))
	cmd.AddCommand(newApprovalsGetCommand(provider))
	cmd.AddCommand(newApprovalsApproveCommand(provider))
	cmd.AddCommand(newApprovalsRejectCommand(provider))
	cmd.AddCommand(newApprovalsCommentCommand(provider))
	return cmd
}

func newApprovalsListCommand(provider shared.RuntimeProvider) *cobra.Command {
	var status string
	var approvalType string
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List approvals",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"status": status,
				"type":   approvalType,
			})
			return shared.GetAndRender(cmd.Context(), provider, "control approvals list", shared.Path(basePath, "approvals"), query, true)
		},
	}
	cmd.Flags().StringVar(&status, "status", "", "Filter by status")
	cmd.Flags().StringVar(&approvalType, "type", "", "Filter by type")
	return cmd
}

func newApprovalsGetCommand(provider shared.RuntimeProvider) *cobra.Command {
	var approvalID string
	cmd := &cobra.Command{
		Use:   "get",
		Short: "Get approval details",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path(basePath, "approvals", approvalID)
			return shared.GetAndRender(cmd.Context(), provider, "control approvals get", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&approvalID, "id", "", "Approval identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newApprovalsApproveCommand(provider shared.RuntimeProvider) *cobra.Command {
	var approvalID string
	cmd := &cobra.Command{
		Use:   "approve",
		Short: "Approve a request",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path(basePath, "approvals", approvalID, "approve")
			return shared.PostMutationAndRender(cmd.Context(), provider, "control approvals approve", path, nil, map[string]any{}, true)
		},
	}
	cmd.Flags().StringVar(&approvalID, "id", "", "Approval identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newApprovalsRejectCommand(provider shared.RuntimeProvider) *cobra.Command {
	var approvalID string
	var note string
	cmd := &cobra.Command{
		Use:   "reject",
		Short: "Reject a request",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{}
			if note != "" {
				body["note"] = note
			}
			path := shared.Path(basePath, "approvals", approvalID, "reject")
			return shared.PostMutationAndRender(cmd.Context(), provider, "control approvals reject", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&approvalID, "id", "", "Approval identifier")
	cmd.Flags().StringVar(&note, "note", "", "Rejection note")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newApprovalsCommentCommand(provider shared.RuntimeProvider) *cobra.Command {
	var approvalID string
	var body string
	cmd := &cobra.Command{
		Use:   "comment",
		Short: "Add comment to approval",
		RunE: func(cmd *cobra.Command, args []string) error {
			payload := map[string]any{"body": body}
			path := shared.Path(basePath, "approvals", approvalID, "comments")
			return shared.PostAndRender(cmd.Context(), provider, "control approvals comment", path, nil, payload, true)
		},
	}
	cmd.Flags().StringVar(&approvalID, "id", "", "Approval identifier")
	cmd.Flags().StringVar(&body, "body", "", "Comment body")
	_ = cmd.MarkFlagRequired("id")
	_ = cmd.MarkFlagRequired("body")
	return cmd
}

// ---------------------------------------------------------------------------
// costs
// ---------------------------------------------------------------------------

func newCostsCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "costs",
		Short: "Cost tracking",
	}
	cmd.AddCommand(newCostsSummaryCommand(provider))
	cmd.AddCommand(newCostsByAgentCommand(provider))
	cmd.AddCommand(newCostsByProjectCommand(provider))
	return cmd
}

func newCostsSummaryCommand(provider shared.RuntimeProvider) *cobra.Command {
	var from string
	var to string
	cmd := &cobra.Command{
		Use:   "summary",
		Short: "Cost summary",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"from": from,
				"to":   to,
			})
			return shared.GetAndRender(cmd.Context(), provider, "control costs summary", shared.Path(basePath, "costs", "summary"), query, true)
		},
	}
	cmd.Flags().StringVar(&from, "from", "", "Start date (ISO 8601)")
	cmd.Flags().StringVar(&to, "to", "", "End date (ISO 8601)")
	return cmd
}

func newCostsByAgentCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	cmd := &cobra.Command{
		Use:   "by-agent",
		Short: "Costs by agent",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path(basePath, "costs", "by-agent", agentID)
			return shared.GetAndRender(cmd.Context(), provider, "control costs by-agent", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "agent-id", "", "Agent identifier")
	_ = cmd.MarkFlagRequired("agent-id")
	return cmd
}

func newCostsByProjectCommand(provider shared.RuntimeProvider) *cobra.Command {
	var projectID string
	cmd := &cobra.Command{
		Use:   "by-project",
		Short: "Costs by project",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path(basePath, "costs", "by-project", projectID)
			return shared.GetAndRender(cmd.Context(), provider, "control costs by-project", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&projectID, "project-id", "", "Project identifier")
	_ = cmd.MarkFlagRequired("project-id")
	return cmd
}

// ---------------------------------------------------------------------------
// activity
// ---------------------------------------------------------------------------

func newActivityCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "activity",
		Short: "Activity log",
	}
	cmd.AddCommand(newActivityListCommand(provider))
	return cmd
}

func newActivityListCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	var entityType string
	var limit int
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List activity entries",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"agentId":    agentID,
				"entityType": entityType,
				"limit":      shared.IntToString(limit),
			})
			return shared.GetAndRender(cmd.Context(), provider, "control activity list", shared.Path(basePath, "activity"), query, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "agent-id", "", "Filter by agent")
	cmd.Flags().StringVar(&entityType, "entity-type", "", "Filter by entity type")
	cmd.Flags().IntVar(&limit, "limit", 50, "Page size")
	return cmd
}

// ---------------------------------------------------------------------------
// runs
// ---------------------------------------------------------------------------

func newRunsCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "runs",
		Short: "Heartbeat runs",
	}
	cmd.AddCommand(newRunsListCommand(provider))
	cmd.AddCommand(newRunsGetCommand(provider))
	cmd.AddCommand(newRunsWatchCommand(provider))
	return cmd
}

func newRunsListCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	var status string
	var limit int
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List runs",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"agentId": agentID,
				"status":  status,
				"limit":   shared.IntToString(limit),
			})
			return shared.GetAndRender(cmd.Context(), provider, "control runs list", shared.Path(basePath, "runs"), query, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "agent-id", "", "Filter by agent")
	cmd.Flags().StringVar(&status, "status", "", "Filter by status")
	cmd.Flags().IntVar(&limit, "limit", 20, "Page size")
	return cmd
}

func newRunsGetCommand(provider shared.RuntimeProvider) *cobra.Command {
	var runID string
	cmd := &cobra.Command{
		Use:   "get",
		Short: "Get run details",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path(basePath, "runs", runID)
			return shared.GetAndRender(cmd.Context(), provider, "control runs get", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&runID, "id", "", "Run identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newRunsWatchCommand(provider shared.RuntimeProvider) *cobra.Command {
	var runID string
	cmd := &cobra.Command{
		Use:   "watch",
		Short: "Stream run events",
		RunE: func(cmd *cobra.Command, args []string) error {
			rt, err := provider()
			if err != nil {
				return err
			}
			if err := rt.RequireAPIKey(); err != nil {
				return err
			}
			path := shared.Path(basePath, "runs", runID, "watch")
			return rt.Stream(cmd.Context(), path, url.Values{}, nil, func(event api.SSEEvent) error {
				if event.Data == "" {
					return nil
				}
				if rt.Output.Format == output.FormatJSON || rt.Output.Format == output.FormatNDJSON {
					_, writeErr := rt.Streams.Out.Write([]byte(event.Data + "\n"))
					return writeErr
				}
				var value any
				if jsonErr := json.Unmarshal([]byte(event.Data), &value); jsonErr != nil {
					_, writeErr := rt.Streams.Out.Write([]byte(event.Data + "\n"))
					return writeErr
				}
				return output.Render(rt.Streams.Out, value, output.Options{Format: rt.Output.Format})
			})
		},
	}
	cmd.Flags().StringVar(&runID, "id", "", "Run identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

// ---------------------------------------------------------------------------
// dashboard
// ---------------------------------------------------------------------------

func newDashboardCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "dashboard",
		Short: "Dashboard summary",
	}
	cmd.AddCommand(newDashboardGetCommand(provider))
	return cmd
}

func newDashboardGetCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get",
		Short: "Get dashboard summary",
		RunE: func(cmd *cobra.Command, args []string) error {
			return shared.GetAndRender(cmd.Context(), provider, "control dashboard get", shared.Path(basePath, "dashboard"), nil, true)
		},
	}
	return cmd
}
