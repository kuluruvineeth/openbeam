package daemon

import (
	"fmt"

	"github.com/spf13/cobra"

	daemonlib "github.com/kuluruvineeth/openbeam/apps/cli/internal/daemon"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func newStatusCommand() *cobra.Command {
	var home string

	cmd := &cobra.Command{
		Use:   "status",
		Short: "Show daemon status",
		RunE: func(cmd *cobra.Command, args []string) error {
			daemonHome := daemonlib.ResolveDaemonHome(home)
			out := cmd.OutOrStdout()

			state, err := daemonlib.GetState(cmd.Context(), daemonHome)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to read daemon state", err)
			}

			if state.PidInfo == nil {
				fmt.Fprintln(out, "Status:  stopped")
				fmt.Fprintf(out, "Home:    %s\n", daemonHome)
				return nil
			}

			if !state.Running {
				fmt.Fprintln(out, "Status:  stopped (stale pid file)")
				fmt.Fprintf(out, "Home:    %s\n", daemonHome)
				fmt.Fprintf(out, "PID:     %d (not running)\n", state.PidInfo.PID)
				return nil
			}

			if state.Healthy && state.Health != nil {
				fmt.Fprintln(out, "Status:  running")
				fmt.Fprintf(out, "Home:    %s\n", daemonHome)
				fmt.Fprintf(out, "PID:     %d\n", state.PidInfo.PID)
				fmt.Fprintf(out, "Listen:  %s\n", state.Listen)
				fmt.Fprintf(out, "Server:  %s\n", state.Health.ServerID)
				fmt.Fprintf(out, "Version: %s\n", state.Health.Version)
				fmt.Fprintf(out, "Uptime:  %s\n", daemonlib.FormatUptime(state.Health.Uptime))
			} else {
				fmt.Fprintln(out, "Status:  unresponsive")
				fmt.Fprintf(out, "Home:    %s\n", daemonHome)
				fmt.Fprintf(out, "PID:     %d\n", state.PidInfo.PID)
				fmt.Fprintf(out, "Listen:  %s\n", state.Listen)
			}

			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	return cmd
}
