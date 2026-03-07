package agent

import (
	"fmt"

	"github.com/spf13/cobra"

	daemonlib "github.com/kuluruvineeth/openbeam/apps/cli/internal/daemon"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func newArchiveCommand() *cobra.Command {
	var home string
	var force bool

	cmd := &cobra.Command{
		Use:   "archive <agent-id>",
		Short: "Archive an agent",
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

			snapshot, err := getAgentSnapshot(cmd, client, agentID)
			if err != nil {
				return err
			}

			if snapshot.Status == "running" && !force {
				return errs.New(errs.KindUsage, "agent is still running; use --force to archive anyway", nil)
			}

			_, err = client.Post(cmd.Context(), fmt.Sprintf("/api/agents/%s/archive", agentID), nil)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to archive agent", err)
			}

			fmt.Fprintf(cmd.OutOrStdout(), "Agent %s archived\n", agentID[:min(7, len(agentID))])
			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	cmd.Flags().BoolVar(&force, "force", false, "Archive even if running")
	return cmd
}
