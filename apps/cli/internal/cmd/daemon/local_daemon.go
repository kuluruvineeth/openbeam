package daemon

import (
	"fmt"

	"github.com/spf13/cobra"

	daemonlib "github.com/openplane/openplane/apps/cli/internal/daemon"
	"github.com/openplane/openplane/apps/cli/internal/errs"
)

func newLocalDaemonCommand() *cobra.Command {
	var home string

	cmd := &cobra.Command{
		Use:   "info",
		Short: "Show local daemon details",
		RunE: func(cmd *cobra.Command, args []string) error {
			daemonHome := daemonlib.ResolveDaemonHome(home)
			out := cmd.OutOrStdout()

			state, err := daemonlib.GetState(cmd.Context(), daemonHome)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to read daemon state", err)
			}

			fmt.Fprintf(out, "Home:       %s\n", daemonHome)
			fmt.Fprintf(out, "Arch:       %s\n", daemonlib.RuntimeArch())

			if state.PidInfo == nil {
				fmt.Fprintf(out, "Status:     stopped\n")
				return nil
			}

			fmt.Fprintf(out, "PID:        %d\n", state.PidInfo.PID)
			fmt.Fprintf(out, "Started:    %s\n", state.PidInfo.StartedAt)
			fmt.Fprintf(out, "Listen:     %s\n", state.Listen)
			fmt.Fprintf(out, "Running:    %t\n", state.Running)
			fmt.Fprintf(out, "Healthy:    %t\n", state.Healthy)

			if state.Health != nil {
				fmt.Fprintf(out, "Server:     %s\n", state.Health.ServerID)
				fmt.Fprintf(out, "Version:    %s\n", state.Health.Version)
				fmt.Fprintf(out, "Uptime:     %s\n", daemonlib.FormatUptime(state.Health.Uptime))
			}

			keyPath := daemonlib.SessionKeyPath(daemonHome)
			fmt.Fprintf(out, "SessionKey: %s\n", keyPath)

			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	return cmd
}
