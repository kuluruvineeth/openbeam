package permit

import "github.com/spf13/cobra"

func NewCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "permit",
		Short: "Manage agent permission requests",
	}
	cmd.AddCommand(newLsCommand())
	cmd.AddCommand(newAllowCommand())
	cmd.AddCommand(newDenyCommand())
	return cmd
}
