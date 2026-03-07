package daemon

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	daemonlib "github.com/kuluruvineeth/openbeam/apps/cli/internal/daemon"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func newStartCommand() *cobra.Command {
	var listen string
	var home string
	var foreground bool

	cmd := &cobra.Command{
		Use:   "start",
		Short: "Start the local daemon",
		RunE: func(cmd *cobra.Command, args []string) error {
			daemonHome := daemonlib.ResolveDaemonHome(home)
			listenAddr := daemonlib.ResolveListen(listen)

			state, err := daemonlib.GetState(cmd.Context(), daemonHome)
			if err == nil && state.Running && state.Healthy {
				fmt.Fprintf(cmd.OutOrStdout(), "Daemon is already running (PID %d) on %s\n", state.PidInfo.PID, state.Listen)
				return nil
			}

			if foreground {
				return runForeground(daemonHome, listenAddr)
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
	cmd.Flags().BoolVar(&foreground, "foreground", false, "Run in foreground")
	return cmd
}

func runForeground(daemonHome string, listen string) error {
	bunPath, err := daemonlib.FindDaemonBinary()
	if err != nil {
		return err
	}

	daemonEntry := ""
	candidates := []string{
		"apps/daemon/src/index.ts",
		"../daemon/src/index.ts",
	}
	cwd, _ := os.Getwd()
	for _, c := range candidates {
		full := c
		if len(c) > 0 && c[0] != '/' {
			full = cwd + "/" + c
		}
		if _, statErr := os.Stat(full); statErr == nil {
			daemonEntry = full
			break
		}
	}
	if daemonEntry == "" {
		return errs.New(errs.KindNotFound, "daemon source not found", nil)
	}

	env := os.Environ()
	env = append(env,
		"OPENBEAM_DAEMON_HOME="+daemonHome,
		"OPENBEAM_LISTEN="+listen,
	)

	return syscallExec(bunPath, []string{bunPath, "run", "--hot", daemonEntry}, env)
}
