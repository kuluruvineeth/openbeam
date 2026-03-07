package research

import (
	"github.com/spf13/cobra"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/shared"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "research",
		Short: "Research workflow orchestration",
	}
	cmd.AddCommand(newStartCommand(provider))
	cmd.AddCommand(newProgressCommand(provider))
	cmd.AddCommand(newArtifactsCommand(provider))
	cmd.AddCommand(newCancelCommand(provider))
	return cmd
}

func newStartCommand(provider shared.RuntimeProvider) *cobra.Command {
	var prompt string
	var maxSteps int
	cmd := &cobra.Command{
		Use:   "start",
		Short: "Start research workflow",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := buildStartBody(prompt, maxSteps, cmd.Flags().Changed("max-steps"))
			return shared.PostMutationAndRender(cmd.Context(), provider, "research start", "/api/v1/research/start", nil, body, true)
		},
	}
	cmd.Flags().StringVar(&prompt, "prompt", "", "Research prompt")
	cmd.Flags().IntVar(&maxSteps, "max-steps", 0, "Maximum workflow steps")
	_ = cmd.MarkFlagRequired("prompt")
	return cmd
}

func newProgressCommand(provider shared.RuntimeProvider) *cobra.Command {
	var workflowID string
	cmd := &cobra.Command{
		Use:   "progress",
		Short: "Get research workflow progress",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/research", workflowID, "progress")
			return shared.GetAndRender(cmd.Context(), provider, "research progress", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&workflowID, "workflow-id", "", "Research workflow identifier")
	_ = cmd.MarkFlagRequired("workflow-id")
	return cmd
}

func newArtifactsCommand(provider shared.RuntimeProvider) *cobra.Command {
	var workflowID string
	cmd := &cobra.Command{
		Use:   "artifacts",
		Short: "Get research workflow artifacts",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/research", workflowID, "artifacts")
			return shared.GetAndRender(cmd.Context(), provider, "research artifacts", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&workflowID, "workflow-id", "", "Research workflow identifier")
	_ = cmd.MarkFlagRequired("workflow-id")
	return cmd
}

func newCancelCommand(provider shared.RuntimeProvider) *cobra.Command {
	var workflowID string
	cmd := &cobra.Command{
		Use:   "cancel",
		Short: "Cancel research workflow",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/research", workflowID, "cancel")
			return shared.PostMutationAndRender(cmd.Context(), provider, "research cancel", path, nil, map[string]any{}, true)
		},
	}
	cmd.Flags().StringVar(&workflowID, "workflow-id", "", "Research workflow identifier")
	_ = cmd.MarkFlagRequired("workflow-id")
	return cmd
}

func buildStartBody(prompt string, maxSteps int, includeMaxSteps bool) map[string]any {
	body := map[string]any{
		"prompt": prompt,
	}
	if includeMaxSteps {
		body["options"] = map[string]any{
			"maxSteps": maxSteps,
		}
	}
	return body
}
