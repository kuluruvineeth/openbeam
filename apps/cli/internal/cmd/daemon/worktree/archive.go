package worktree

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"

	daemonlib "github.com/openplane/openplane/apps/cli/internal/daemon"
	"github.com/openplane/openplane/apps/cli/internal/errs"
)

func newArchiveCommand() *cobra.Command {
	var home string

	cmd := &cobra.Command{
		Use:   "archive <worktree-path>",
		Short: "Archive a worktree and its agents",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			daemonHome := daemonlib.ResolveDaemonHome(home)
			client, err := daemonlib.NewClientFromState(cmd.Context(), daemonHome)
			if err != nil {
				return errs.New(errs.KindUnknown, "cannot connect to daemon", err)
			}

			reqBody := daemonlib.WorktreeArchiveRequest{WorktreePath: args[0]}

			raw, err := client.Post(cmd.Context(), "/api/worktrees/archive", reqBody)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to archive worktree", err)
			}

			var resp daemonlib.WorktreeArchiveResponse
			if err := json.Unmarshal(raw, &resp); err != nil {
				return errs.New(errs.KindUnknown, "invalid archive response", err)
			}

			if resp.Error != nil {
				return errs.New(errs.KindUnknown, resp.Error.Message, nil)
			}

			out := cmd.OutOrStdout()
			fmt.Fprintf(out, "Worktree %s archived\n", args[0])
			if len(resp.RemovedAgents) > 0 {
				fmt.Fprintf(out, "Removed %d agent(s)\n", len(resp.RemovedAgents))
			}
			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	return cmd
}
