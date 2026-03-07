package agent

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"

	daemonlib "github.com/kuluruvineeth/openbeam/apps/cli/internal/daemon"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func newModeCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "mode",
		Short: "Manage agent modes",
	}
	cmd.AddCommand(newModeListCommand())
	cmd.AddCommand(newModeSetCommand())
	return cmd
}

func newModeListCommand() *cobra.Command {
	var home string

	cmd := &cobra.Command{
		Use:   "list <agent-id>",
		Short: "List available modes for an agent",
		Args:  cobra.ExactArgs(1),
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

			snapshot, err := getAgentSnapshot(cmd, client, agentID)
			if err != nil {
				return err
			}

			out := cmd.OutOrStdout()
			if len(snapshot.AvailableModes) == 0 {
				fmt.Fprintln(out, "No modes available")
				return nil
			}

			for _, m := range snapshot.AvailableModes {
				current := ""
				if m.ID == snapshot.CurrentModeID {
					current = " (current)"
				}
				fmt.Fprintf(out, "%s\t%s%s\n", m.ID, m.Label, current)
			}
			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	return cmd
}

func newModeSetCommand() *cobra.Command {
	var home string

	cmd := &cobra.Command{
		Use:   "set <agent-id> <mode-id>",
		Short: "Set agent mode",
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

			body := map[string]string{"modeId": args[1]}
			raw, err := client.Post(cmd.Context(), fmt.Sprintf("/api/agents/%s/mode", agentID), body)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to set mode", err)
			}

			var snapshot daemonlib.AgentSnapshot
			if err := json.Unmarshal(raw, &snapshot); err != nil {
				return errs.New(errs.KindUnknown, "invalid mode response", err)
			}

			fmt.Fprintf(cmd.OutOrStdout(), "Agent %s mode set to %s\n", agentID[:min(7, len(agentID))], snapshot.CurrentModeID)
			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	return cmd
}
