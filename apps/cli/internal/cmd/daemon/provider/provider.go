package provider

import "github.com/spf13/cobra"

func NewCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "provider",
		Short: "Manage AI providers and models",
	}
	cmd.AddCommand(newLsCommand())
	cmd.AddCommand(newModelsCommand())
	return cmd
}
