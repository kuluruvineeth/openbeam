package worktree

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"

	daemonlib "github.com/kuluruvineeth/openbeam/apps/cli/internal/daemon"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func newLsCommand() *cobra.Command {
	var home string

	cmd := &cobra.Command{
		Use:   "ls",
		Short: "List managed worktrees",
		RunE: func(cmd *cobra.Command, args []string) error {
			daemonHome := daemonlib.ResolveDaemonHome(home)
			client, err := daemonlib.NewClientFromState(cmd.Context(), daemonHome)
			if err != nil {
				return errs.New(errs.KindUnknown, "cannot connect to daemon", err)
			}

			raw, err := client.Get(cmd.Context(), "/api/worktrees", nil)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to list worktrees", err)
			}

			var resp daemonlib.WorktreeListResponse
			if err := json.Unmarshal(raw, &resp); err != nil {
				return errs.New(errs.KindUnknown, "invalid response", err)
			}

			if resp.Error != nil {
				return errs.New(errs.KindUnknown, resp.Error.Message, nil)
			}

			out := cmd.OutOrStdout()
			if len(resp.Worktrees) == 0 {
				fmt.Fprintln(out, "No worktrees found")
				return nil
			}

			for _, wt := range resp.Worktrees {
				branch := wt.BranchName
				if branch == "" {
					branch = "(detached)"
				}
				fmt.Fprintf(out, "%s\t%s\n", wt.WorktreePath, branch)
			}
			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	return cmd
}
