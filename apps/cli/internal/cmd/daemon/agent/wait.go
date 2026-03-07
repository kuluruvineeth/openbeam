package agent

import (
	"fmt"
	"time"

	"github.com/spf13/cobra"

	daemonlib "github.com/kuluruvineeth/openbeam/apps/cli/internal/daemon"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func newWaitCommand() *cobra.Command {
	var home string
	var timeout time.Duration

	cmd := &cobra.Command{
		Use:   "wait <agent-id>",
		Short: "Wait for an agent to reach idle state",
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

			deadline := time.After(timeout)
			ticker := time.NewTicker(500 * time.Millisecond)
			defer ticker.Stop()

			for {
				select {
				case <-cmd.Context().Done():
					return cmd.Context().Err()
				case <-deadline:
					return errs.New(errs.KindTimeout, fmt.Sprintf("agent did not become idle within %s", timeout), nil)
				case <-ticker.C:
					snapshot, err := getAgentSnapshot(cmd, client, agentID)
					if err != nil {
						return err
					}
					switch snapshot.Status {
					case "idle", "stopped", "archived":
						fmt.Fprintf(cmd.OutOrStdout(), "Agent %s is %s\n", agentID[:min(7, len(agentID))], snapshot.Status)
						return nil
					case "error":
						return errs.New(errs.KindUnknown, fmt.Sprintf("agent %s entered error state", agentID[:min(7, len(agentID))]), nil)
					}
				}
			}
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	cmd.Flags().DurationVar(&timeout, "timeout", 5*time.Minute, "Maximum time to wait")
	return cmd
}
