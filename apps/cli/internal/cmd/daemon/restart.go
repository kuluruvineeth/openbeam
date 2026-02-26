package daemon

import (
	"fmt"

	"github.com/spf13/cobra"

	daemonlib "github.com/openplane/openplane/apps/cli/internal/daemon"
	"github.com/openplane/openplane/apps/cli/internal/errs"
)

func newRestartCommand() *cobra.Command {
	var listen string
	var home string

	cmd := &cobra.Command{
		Use:   "restart",
		Short: "Restart the local daemon",
		RunE: func(cmd *cobra.Command, args []string) error {
			daemonHome := daemonlib.ResolveDaemonHome(home)
			listenAddr := daemonlib.ResolveListen(listen)

			state, stateErr := daemonlib.GetState(cmd.Context(), daemonHome)
			if stateErr == nil && state.Running && state.PidInfo != nil {
				fmt.Fprintf(cmd.OutOrStdout(), "Stopping daemon (PID %d)...\n", state.PidInfo.PID)
				if err := daemonlib.StopGraceful(cmd.Context(), daemonHome, daemonlib.StopTimeout); err != nil {
					return errs.New(errs.KindUnknown, "failed to stop daemon", err)
				}
				fmt.Fprintln(cmd.OutOrStdout(), "Daemon stopped")
			}

			pid, err := daemonlib.StartDetached(daemonHome, listenAddr)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to start daemon", err)
			}

			fmt.Fprintf(cmd.OutOrStdout(), "Daemon starting (PID %d)...\n", pid)

			if err := daemonlib.WaitForReady(cmd.Context(), listenAddr, daemonlib.StartupTimeout); err != nil {
				fmt.Fprintf(cmd.ErrOrStderr(), "Warning: daemon started but health check failed: %v\n", err)
				return nil
			}

			fmt.Fprintf(cmd.OutOrStdout(), "Daemon ready on %s\n", listenAddr)
			return nil
		},
	}

	cmd.Flags().StringVar(&listen, "listen", "", "Listen address (host:port)")
	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	return cmd
}
