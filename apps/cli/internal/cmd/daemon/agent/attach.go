package agent

import (
	"github.com/spf13/cobra"

	daemonlib "github.com/kuluruvineeth/openbeam/apps/cli/internal/daemon"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func newAttachCommand() *cobra.Command {
	var home string
	var filter string

	cmd := &cobra.Command{
		Use:   "attach <agent-id>",
		Short: "Attach to a running agent and stream output",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			daemonHome := daemonlib.ResolveDaemonHome(home)
			client, err := daemonlib.NewClientFromState(cmd.Context(), daemonHome)
			if err != nil {
				return errs.New(errs.KindUnknown, "cannot connect to daemon", err)
			}

			agentID, err := resolveAgentFromArg(cmd, client, args[0])
			if err != nil {
				return err
			}

			return streamTimeline(cmd, client, daemonHome, agentID, filter)
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	cmd.Flags().StringVar(&filter, "filter", "", "Filter timeline items (tools, text, errors)")
	return cmd
}

func resolveAgentFromArg(cmd *cobra.Command, client *daemonlib.Client, idOrPrefix string) (string, error) {
	raw, err := client.Get(cmd.Context(), "/api/agents", nil)
	if err != nil {
		return "", errs.New(errs.KindUnknown, "failed to list agents", err)
	}

	var resp daemonlib.AgentListResponse
	if err := parseJSON(raw, &resp); err != nil {
		return "", err
	}

	var snapshots []daemonlib.AgentSnapshot
	for _, entry := range resp.Entries {
		snapshots = append(snapshots, entry.Agent)
	}

	match, err := daemonlib.ResolveAgentID(snapshots, idOrPrefix)
	if err != nil {
		return "", errs.New(errs.KindNotFound, err.Error(), nil)
	}
	return match.ID, nil
}
