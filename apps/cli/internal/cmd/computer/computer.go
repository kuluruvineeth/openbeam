package computer

import (
	"fmt"
	"strings"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/shared"
	"github.com/spf13/cobra"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "computer",
		Short: "Autonomous agent management",
	}
	cmd.AddCommand(newCatalogCommand(provider))
	cmd.AddCommand(newListCommand(provider))
	cmd.AddCommand(newEnableCommand(provider))
	cmd.AddCommand(newDisableCommand(provider))
	cmd.AddCommand(newRemoveCommand(provider))
	cmd.AddCommand(newRunCommand(provider))
	cmd.AddCommand(newRunsCommand(provider))
	cmd.AddCommand(newMemoryCommand(provider))
	cmd.AddCommand(newApproveCommand(provider))
	cmd.AddCommand(newRejectCommand(provider))
	cmd.AddCommand(newGenerateCommand(provider))
	return cmd
}

func newCatalogCommand(provider shared.RuntimeProvider) *cobra.Command {
	return &cobra.Command{
		Use:   "catalog",
		Short: "List pre-built agent catalog",
		RunE: func(cmd *cobra.Command, _ []string) error {
			return shared.GetAndRender(cmd.Context(), provider, "computer catalog", "/api/v1/computer/catalog", nil, true)
		},
	}
}

func newListCommand(provider shared.RuntimeProvider) *cobra.Command {
	return &cobra.Command{
		Use:   "list",
		Short: "List team agents",
		RunE: func(cmd *cobra.Command, _ []string) error {
			return shared.GetAndRender(cmd.Context(), provider, "computer list", "/api/v1/computer/agents", nil, true)
		},
	}
}

func newEnableCommand(provider shared.RuntimeProvider) *cobra.Command {
	var templateID string
	cmd := &cobra.Command{
		Use:   "enable",
		Short: "Enable a catalog agent",
		RunE: func(cmd *cobra.Command, _ []string) error {
			body := map[string]any{"templateId": templateID}
			return shared.PostMutationAndRender(cmd.Context(), provider, "computer enable", "/api/v1/computer/agents", nil, body, true)
		},
	}
	cmd.Flags().StringVar(&templateID, "template-id", "", "Catalog agent template ID")
	_ = cmd.MarkFlagRequired("template-id")
	return cmd
}

func newDisableCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	cmd := &cobra.Command{
		Use:   "disable",
		Short: "Disable an agent",
		RunE: func(cmd *cobra.Command, _ []string) error {
			path := shared.Path("/api/v1/computer/agents", agentID)
			body := map[string]any{"status": "PAUSED"}
			return shared.PatchMutationAndRender(cmd.Context(), provider, "computer disable", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "agent-id", "", "Agent ID")
	_ = cmd.MarkFlagRequired("agent-id")
	return cmd
}

func newRemoveCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	cmd := &cobra.Command{
		Use:   "remove",
		Short: "Remove an agent",
		RunE: func(cmd *cobra.Command, _ []string) error {
			path := shared.Path("/api/v1/computer/agents", agentID)
			return shared.DeleteMutationAndRender(cmd.Context(), provider, "computer remove", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "agent-id", "", "Agent ID")
	_ = cmd.MarkFlagRequired("agent-id")
	return cmd
}

func newRunCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	cmd := &cobra.Command{
		Use:   "run",
		Short: "Trigger an agent run",
		RunE: func(cmd *cobra.Command, _ []string) error {
			path := shared.Path("/api/v1/computer/agents", agentID, "run")
			return shared.PostMutationAndRender(cmd.Context(), provider, "computer run", path, nil, map[string]any{}, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "agent-id", "", "Agent ID")
	_ = cmd.MarkFlagRequired("agent-id")
	return cmd
}

func newRunsCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	var limit int
	cmd := &cobra.Command{
		Use:   "runs",
		Short: "List agent run history",
		RunE: func(cmd *cobra.Command, _ []string) error {
			path := shared.Path("/api/v1/computer/agents", agentID, "runs")
			query := shared.QueryFromMap(map[string]string{
				"limit": fmt.Sprintf("%d", limit),
			})
			return shared.GetAndRender(cmd.Context(), provider, "computer runs", path, query, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "agent-id", "", "Agent ID")
	cmd.Flags().IntVar(&limit, "limit", 20, "Number of runs to show")
	_ = cmd.MarkFlagRequired("agent-id")
	return cmd
}

func newMemoryCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	cmd := &cobra.Command{
		Use:   "memory",
		Short: "View agent memory entries",
		RunE: func(cmd *cobra.Command, _ []string) error {
			path := shared.Path("/api/v1/computer/agents", agentID, "memory")
			return shared.GetAndRender(cmd.Context(), provider, "computer memory", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "agent-id", "", "Agent ID")
	_ = cmd.MarkFlagRequired("agent-id")
	return cmd
}

func newApproveCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	var runID string
	var pick string
	cmd := &cobra.Command{
		Use:   "approve",
		Short: "Approve proposed actions",
		RunE: func(cmd *cobra.Command, _ []string) error {
			path := shared.Path("/api/v1/computer/agents", agentID, "runs", runID, "approve")
			body := map[string]any{}
			if pick != "" {
				body["approvedIndices"] = parseIndices(pick)
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "computer approve", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "agent-id", "", "Agent ID")
	cmd.Flags().StringVar(&runID, "run-id", "", "Run ID")
	cmd.Flags().StringVar(&pick, "pick", "", "Comma-separated indices to approve (e.g. 0,2,4)")
	_ = cmd.MarkFlagRequired("agent-id")
	_ = cmd.MarkFlagRequired("run-id")
	return cmd
}

func newRejectCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	var runID string
	cmd := &cobra.Command{
		Use:   "reject",
		Short: "Reject proposed actions",
		RunE: func(cmd *cobra.Command, _ []string) error {
			path := shared.Path("/api/v1/computer/agents", agentID, "runs", runID, "reject")
			return shared.PostMutationAndRender(cmd.Context(), provider, "computer reject", path, nil, map[string]any{}, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "agent-id", "", "Agent ID")
	cmd.Flags().StringVar(&runID, "run-id", "", "Run ID")
	_ = cmd.MarkFlagRequired("agent-id")
	_ = cmd.MarkFlagRequired("run-id")
	return cmd
}

func newGenerateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var description string
	cmd := &cobra.Command{
		Use:   "generate",
		Short: "Generate agent from description",
		RunE: func(cmd *cobra.Command, _ []string) error {
			body := map[string]any{"description": description}
			return shared.PostAndRender(cmd.Context(), provider, "computer generate", "/api/v1/computer/generate", nil, body, true)
		},
	}
	cmd.Flags().StringVar(&description, "description", "", "What the agent should do")
	_ = cmd.MarkFlagRequired("description")
	return cmd
}

func parseIndices(pick string) []int {
	parts := strings.Split(pick, ",")
	indices := make([]int, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		var n int
		if _, err := fmt.Sscanf(trimmed, "%d", &n); err == nil {
			indices = append(indices, n)
		}
	}
	return indices
}
