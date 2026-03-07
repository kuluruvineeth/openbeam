package agent

import (
	"encoding/json"
	"net/url"

	"github.com/spf13/cobra"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/api"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/shared"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/output"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "agent",
		Short: "Agent execution APIs",
	}
	cmd.AddCommand(newRunCommand(provider))
	cmd.AddCommand(newStreamCommand(provider))
	return cmd
}

func newRunCommand(provider shared.RuntimeProvider) *cobra.Command {
	var prompt string
	var agentType string
	var maxSteps int
	cmd := &cobra.Command{
		Use:   "run",
		Short: "Execute agent request",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{
				"prompt":    prompt,
				"agentType": agentType,
				"maxSteps":  maxSteps,
			}
			return shared.PostAndRender(cmd.Context(), provider, "agent run", "/api/agent/execute", nil, body, true)
		},
	}
	cmd.Flags().StringVarP(&prompt, "prompt", "p", "", "Prompt text for the agent")
	cmd.Flags().StringVar(&agentType, "agent-type", "rag", "Type of agent to run")
	cmd.Flags().IntVar(&maxSteps, "max-steps", 10, "Maximum agent execution steps")
	_ = cmd.MarkFlagRequired("prompt")
	return cmd
}

func newStreamCommand(provider shared.RuntimeProvider) *cobra.Command {
	var prompt string
	var agentType string
	var maxSteps int
	cmd := &cobra.Command{
		Use:   "stream",
		Short: "Stream agent events",
		RunE: func(cmd *cobra.Command, args []string) error {
			rt, err := provider()
			if err != nil {
				return err
			}
			if err := rt.RequireAPIKey(); err != nil {
				return err
			}
			query := url.Values{}
			body := map[string]any{
				"prompt":    prompt,
				"agentType": agentType,
				"maxSteps":  maxSteps,
			}
			return rt.Stream(cmd.Context(), "/api/agent/stream", query, body, func(event api.SSEEvent) error {
				if event.Data == "" {
					return nil
				}
				if rt.Output.Format == output.FormatJSON || rt.Output.Format == output.FormatNDJSON {
					_, err := rt.Streams.Out.Write([]byte(event.Data + "\n"))
					return err
				}
				var value any
				if err := json.Unmarshal([]byte(event.Data), &value); err != nil {
					_, writeErr := rt.Streams.Out.Write([]byte(event.Data + "\n"))
					return writeErr
				}
				return output.Render(rt.Streams.Out, value, output.Options{Format: rt.Output.Format})
			})
		},
	}
	cmd.Flags().StringVarP(&prompt, "prompt", "p", "", "Prompt text for the agent")
	cmd.Flags().StringVar(&agentType, "agent-type", "rag", "Type of agent to run")
	cmd.Flags().IntVar(&maxSteps, "max-steps", 10, "Maximum agent execution steps")
	_ = cmd.MarkFlagRequired("prompt")
	return cmd
}
