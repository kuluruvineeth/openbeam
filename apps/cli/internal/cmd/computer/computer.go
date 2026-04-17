package computer

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/api"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/shared"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
	"github.com/spf13/cobra"
)

const (
	pollIntervalSec = 2
	pollTimeoutSec  = 120
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
	cmd.AddCommand(newProposalsCommand(provider))
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
	cmd := &cobra.Command{
		Use:   "disable <agent-id>",
		Short: "Disable an agent",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/computer/agents", args[0])
			body := map[string]any{"status": "PAUSED"}
			return shared.PatchMutationAndRender(cmd.Context(), provider, "computer disable", path, nil, body, true)
		},
	}
	return cmd
}

func newRemoveCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "remove <agent-id>",
		Short: "Remove an agent",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/computer/agents", args[0])
			return shared.DeleteMutationAndRender(cmd.Context(), provider, "computer remove", path, nil, true)
		},
	}
	return cmd
}

func newRunCommand(provider shared.RuntimeProvider) *cobra.Command {
	var wait bool
	cmd := &cobra.Command{
		Use:   "run <agent-id>",
		Short: "Trigger an agent run",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			agentID := args[0]
			path := shared.Path("/api/v1/computer/agents", agentID, "run")

			if !wait {
				return shared.PostMutationAndRender(cmd.Context(), provider, "computer run", path, nil, map[string]any{}, true)
			}

			return runAndWait(cmd.Context(), provider, agentID, path)
		},
	}
	cmd.Flags().BoolVar(&wait, "wait", false, "Poll until run completes (timeout 120s)")
	return cmd
}

func runAndWait(ctx context.Context, provider shared.RuntimeProvider, agentID string, triggerPath string) error {
	rt, err := provider()
	if err != nil {
		return err
	}
	if err := rt.RequireAPIKey(); err != nil {
		return err
	}
	if err := rt.RequireYesForNonInteractive(); err != nil {
		return err
	}

	result, _, err := rt.Post(ctx, triggerPath, nil, map[string]any{})
	if err != nil {
		return err
	}

	runID, ok := extractRunID(result)
	if !ok {
		return rt.WriteEnvelope("computer run", result, api.Metadata{})
	}

	fmt.Fprintf(rt.Streams.Err, "Run %s started. Polling...\n", runID)

	detailPath := shared.Path("/api/v1/computer/agents", agentID, "runs", runID)
	deadline := time.Now().Add(pollTimeoutSec * time.Second)

	for time.Now().Before(deadline) {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(pollIntervalSec * time.Second):
		}

		detail, meta, err := rt.Get(ctx, detailPath, nil)
		if err != nil {
			return err
		}

		status := extractStatus(detail)
		elapsed := time.Since(deadline.Add(-pollTimeoutSec * time.Second)).Truncate(time.Second)
		fmt.Fprintf(rt.Streams.Err, "  [%s] status: %s\n", elapsed, status)

		if isTerminal(status) {
			return rt.WriteEnvelope("computer run", detail, meta)
		}
	}

	return errs.New(errs.KindTimeout, "run did not complete within 120s", nil)
}

func extractRunID(result any) (string, bool) {
	m, ok := result.(map[string]any)
	if !ok {
		return "", false
	}
	data, ok := m["data"].(map[string]any)
	if !ok {
		return "", false
	}
	id, ok := data["runId"].(string)
	return id, ok
}

func extractStatus(result any) string {
	m, ok := result.(map[string]any)
	if !ok {
		return "unknown"
	}
	data, ok := m["data"].(map[string]any)
	if !ok {
		return "unknown"
	}
	status, ok := data["status"].(string)
	if !ok {
		return "unknown"
	}
	return status
}

func isTerminal(status string) bool {
	switch strings.ToUpper(status) {
	case "COMPLETED", "FAILED", "REJECTED", "WAITING_APPROVAL":
		return true
	default:
		return false
	}
}

func newRunsCommand(provider shared.RuntimeProvider) *cobra.Command {
	var limit int
	cmd := &cobra.Command{
		Use:   "runs <agent-id>",
		Short: "List agent run history",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/computer/agents", args[0], "runs")
			query := shared.QueryFromMap(map[string]string{
				"limit": fmt.Sprintf("%d", limit),
			})
			return shared.GetAndRender(cmd.Context(), provider, "computer runs", path, query, true)
		},
	}
	cmd.Flags().IntVar(&limit, "limit", 20, "Number of runs to show")
	return cmd
}

func newMemoryCommand(provider shared.RuntimeProvider) *cobra.Command {
	return &cobra.Command{
		Use:   "memory <agent-id>",
		Short: "View agent memory entries",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/computer/agents", args[0], "memory")
			return shared.GetAndRender(cmd.Context(), provider, "computer memory", path, nil, true)
		},
	}
}

func newProposalsCommand(provider shared.RuntimeProvider) *cobra.Command {
	return &cobra.Command{
		Use:   "proposals <agent-id> <run-id>",
		Short: "View proposed actions for a run",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/computer/agents", args[0], "runs", args[1], "proposals")
			return shared.GetAndRender(cmd.Context(), provider, "computer proposals", path, nil, true)
		},
	}
}

func newApproveCommand(provider shared.RuntimeProvider) *cobra.Command {
	var pick string
	cmd := &cobra.Command{
		Use:   "approve <agent-id> <run-id>",
		Short: "Approve proposed actions",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/computer/agents", args[0], "runs", args[1], "approve")
			body := map[string]any{}
			if pick != "" {
				body["approvedIndices"] = parseIndices(pick)
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "computer approve", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&pick, "pick", "", "Comma-separated indices to approve (e.g. 0,2,4)")
	return cmd
}

func newRejectCommand(provider shared.RuntimeProvider) *cobra.Command {
	return &cobra.Command{
		Use:   "reject <agent-id> <run-id>",
		Short: "Reject proposed actions",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/computer/agents", args[0], "runs", args[1], "reject")
			return shared.PostMutationAndRender(cmd.Context(), provider, "computer reject", path, nil, map[string]any{}, true)
		},
	}
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

