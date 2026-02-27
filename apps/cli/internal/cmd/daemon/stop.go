package daemon

import (
	"fmt"

	"github.com/spf13/cobra"

	daemonlib "github.com/openplane/openplane/apps/cli/internal/daemon"
	"github.com/openplane/openplane/apps/cli/internal/errs"
)

func newStopCommand() *cobra.Command {
	var home string

	cmd := &cobra.Command{
		Use:   "stop",
		Short: "Stop the local daemon",
		RunE: func(cmd *cobra.Command, args []string) error {
			daemonHome := daemonlib.ResolveDaemonHome(home)

			state, err := daemonlib.GetState(cmd.Context(), daemonHome)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to read daemon state", err)
			}

			if state.PidInfo == nil || !state.Running {
				fmt.Fprintln(cmd.OutOrStdout(), "Daemon is not running")
				return nil
			}

			fmt.Fprintf(cmd.OutOrStdout(), "Stopping daemon (PID %d)...\n", state.PidInfo.PID)

			if err := daemonlib.StopGraceful(cmd.Context(), daemonHome, daemonlib.StopTimeout); err != nil {
				return errs.New(errs.KindUnknown, "failed to stop daemon", err)
			}

			fmt.Fprintln(cmd.OutOrStdout(), "Daemon stopped")
			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	return cmd
}
