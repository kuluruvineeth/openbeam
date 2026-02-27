package speech

import "github.com/spf13/cobra"

func NewCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "speech",
		Short: "Manage speech models",
	}
	cmd.AddCommand(newModelsCommand())
	cmd.AddCommand(newDownloadCommand())
	return cmd
}
