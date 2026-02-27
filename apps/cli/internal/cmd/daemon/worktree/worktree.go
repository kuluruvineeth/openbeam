package worktree

import "github.com/spf13/cobra"

func NewCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "worktree",
		Short: "Manage git worktrees",
	}
	cmd.AddCommand(newLsCommand())
	cmd.AddCommand(newArchiveCommand())
	return cmd
}
