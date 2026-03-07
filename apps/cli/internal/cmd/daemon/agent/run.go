package agent

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"

	daemonlib "github.com/kuluruvineeth/openbeam/apps/cli/internal/daemon"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func newRunCommand() *cobra.Command {
	var home string
	var provider string
	var model string
	var mode string
	var cwd string
	var title string
	var detach bool
	var label []string

	cmd := &cobra.Command{
		Use:   "run [prompt]",
		Short: "Create and start a new agent",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			daemonHome := daemonlib.ResolveDaemonHome(home)
			client, err := daemonlib.NewClientFromState(cmd.Context(), daemonHome)
			if err != nil {
				return errs.New(errs.KindUnknown, "cannot connect to daemon", err)
			}

			labels := parseLabels(label)

			reqBody := daemonlib.AgentCreateRequest{
				Provider:      provider,
				Model:         model,
				ModeID:        mode,
				Cwd:           cwd,
				Title:         title,
				InitialPrompt: args[0],
				Labels:        labels,
			}

			raw, err := client.Post(cmd.Context(), "/api/agents", reqBody)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to create agent", err)
			}

			var snapshot daemonlib.AgentSnapshot
			if err := json.Unmarshal(raw, &snapshot); err != nil {
				return errs.New(errs.KindUnknown, "invalid create response", err)
			}

			out := cmd.OutOrStdout()
			fmt.Fprintf(out, "Agent created: %s\n", snapshot.ID)

			if detach {
				return nil
			}

			return streamTimeline(cmd, client, daemonHome, snapshot.ID, "")
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	cmd.Flags().StringVar(&provider, "provider", "claude", "AI provider")
	cmd.Flags().StringVar(&model, "model", "", "Model name")
	cmd.Flags().StringVar(&mode, "mode", "", "Agent mode ID")
	cmd.Flags().StringVar(&cwd, "cwd", "", "Working directory for the agent")
	cmd.Flags().StringVar(&title, "title", "", "Agent title")
	cmd.Flags().BoolVar(&detach, "detach", false, "Start agent and return immediately")
	cmd.Flags().StringSliceVar(&label, "label", nil, "Labels (key=value)")
	return cmd
}

func parseLabels(raw []string) map[string]string {
	if len(raw) == 0 {
		return nil
	}
	labels := make(map[string]string, len(raw))
	for _, l := range raw {
		for i := range l {
			if l[i] == '=' {
				labels[l[:i]] = l[i+1:]
				break
			}
		}
	}
	return labels
}
