package permit

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"

	daemonlib "github.com/openplane/openplane/apps/cli/internal/daemon"
	"github.com/openplane/openplane/apps/cli/internal/errs"
)

func newLsCommand() *cobra.Command {
	var home string

	cmd := &cobra.Command{
		Use:   "ls",
		Short: "List pending permission requests across all agents",
		RunE: func(cmd *cobra.Command, args []string) error {
			daemonHome := daemonlib.ResolveDaemonHome(home)
			client, err := daemonlib.NewClientFromState(cmd.Context(), daemonHome)
			if err != nil {
				return errs.New(errs.KindUnknown, "cannot connect to daemon", err)
			}

			raw, err := client.Get(cmd.Context(), "/api/agents", nil)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to list agents", err)
			}

			var resp daemonlib.AgentListResponse
			if err := json.Unmarshal(raw, &resp); err != nil {
				return errs.New(errs.KindUnknown, "invalid response", err)
			}

			out := cmd.OutOrStdout()
			found := 0
			for _, entry := range resp.Entries {
				a := entry.Agent
				for _, perm := range a.PendingPermissions {
					agentShort := a.ID
					if len(agentShort) > 7 {
						agentShort = agentShort[:7]
					}
					fmt.Fprintf(out, "%s\t%s\t%s\t%s\n", agentShort, perm.ID, perm.Name, perm.Description)
					found++
				}
			}

			if found == 0 {
				fmt.Fprintln(out, "No pending permission requests")
			}
			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	return cmd
}
