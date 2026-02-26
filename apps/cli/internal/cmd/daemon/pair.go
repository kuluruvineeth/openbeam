package daemon

import (
	"fmt"

	"github.com/spf13/cobra"

	daemonlib "github.com/openplane/openplane/apps/cli/internal/daemon"
	"github.com/openplane/openplane/apps/cli/internal/errs"
)

func newPairCommand() *cobra.Command {
	var home string

	cmd := &cobra.Command{
		Use:   "pair",
		Short: "Print the daemon pairing QR code and link",
		RunE: func(cmd *cobra.Command, args []string) error {
			daemonHome := daemonlib.ResolveDaemonHome(home)

			state, err := daemonlib.GetState(cmd.Context(), daemonHome)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to read daemon state", err)
			}

			if !state.Running || !state.Healthy {
				return errs.New(errs.KindUsage, "daemon is not running; start it with: openplane daemon start", nil)
			}

			health, err := daemonlib.CheckHealth(cmd.Context(), state.Listen)
			if err != nil {
				return errs.New(errs.KindUnknown, "daemon health check failed", err)
			}

			out := cmd.OutOrStdout()
			fmt.Fprintf(out, "\nDaemon pairing info:\n")
			fmt.Fprintf(out, "  Server:  %s\n", health.ServerID)
			fmt.Fprintf(out, "  Listen:  %s\n", state.Listen)
			fmt.Fprintf(out, "  Version: %s\n", health.Version)
			fmt.Fprintf(out, "\nConnect your device to: http://%s\n", state.Listen)

			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	return cmd
}
