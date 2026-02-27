package agent

import "github.com/spf13/cobra"

func NewCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "agent",
		Short: "Manage daemon agents",
	}
	cmd.AddCommand(newLsCommand())
	cmd.AddCommand(newRunCommand())
	cmd.AddCommand(newAttachCommand())
	cmd.AddCommand(newLogsCommand())
	cmd.AddCommand(newStopCommand())
	cmd.AddCommand(newSendCommand())
	cmd.AddCommand(newInspectCommand())
	cmd.AddCommand(newWaitCommand())
	cmd.AddCommand(newArchiveCommand())
	cmd.AddCommand(newModeCommand())
	return cmd
}
