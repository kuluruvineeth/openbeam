package daemon

import (
	"github.com/spf13/cobra"

	agentcmd "github.com/openplane/openplane/apps/cli/internal/cmd/daemon/agent"
	permitcmd "github.com/openplane/openplane/apps/cli/internal/cmd/daemon/permit"
	providercmd "github.com/openplane/openplane/apps/cli/internal/cmd/daemon/provider"
	speechcmd "github.com/openplane/openplane/apps/cli/internal/cmd/daemon/speech"
	worktreecmd "github.com/openplane/openplane/apps/cli/internal/cmd/daemon/worktree"
	"github.com/openplane/openplane/apps/cli/internal/cmd/shared"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "daemon",
		Short: "Manage the local OpenPlane daemon",
	}
	cmd.AddCommand(newStartCommand())
	cmd.AddCommand(newStopCommand())
	cmd.AddCommand(newStatusCommand())
	cmd.AddCommand(newRestartCommand())
	cmd.AddCommand(newPairCommand())
	cmd.AddCommand(newLocalDaemonCommand())
	cmd.AddCommand(agentcmd.NewCommand())
	cmd.AddCommand(permitcmd.NewCommand())
	cmd.AddCommand(providercmd.NewCommand())
	cmd.AddCommand(speechcmd.NewCommand())
	cmd.AddCommand(worktreecmd.NewCommand())
	return cmd
}
