package agent

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"

	daemonlib "github.com/kuluruvineeth/openbeam/apps/cli/internal/daemon"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func newSendCommand() *cobra.Command {
	var home string
	var noWait bool

	cmd := &cobra.Command{
		Use:   "send <agent-id> <prompt>",
		Short: "Send a prompt to an existing agent",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			daemonHome := daemonlib.ResolveDaemonHome(home)
			client, err := daemonlib.NewClientFromState(cmd.Context(), daemonHome)
			if err != nil {
				return errs.New(errs.KindUnknown, "cannot connect to daemon", err)
			}

			agentID, err := resolveAgentFromArg(cmd, client, args[0])
			if err != nil {
				return err
			}

			reqBody := daemonlib.AgentSendRequest{Prompt: args[1]}
			raw, err := client.Post(cmd.Context(), fmt.Sprintf("/api/agents/%s/send", agentID), reqBody)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to send prompt", err)
			}

			var snapshot daemonlib.AgentSnapshot
			if err := json.Unmarshal(raw, &snapshot); err != nil {
				return errs.New(errs.KindUnknown, "invalid send response", err)
			}

			fmt.Fprintf(cmd.OutOrStdout(), "Prompt sent to agent %s\n", snapshot.ID[:min(7, len(snapshot.ID))])

			if noWait {
				return nil
			}

			return streamTimeline(cmd, client, daemonHome, agentID, "")
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	cmd.Flags().BoolVar(&noWait, "no-wait", false, "Return immediately without streaming output")
	return cmd
}
