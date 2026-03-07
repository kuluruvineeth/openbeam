package agent

import (
	"encoding/json"
	"fmt"
	"net/url"

	"github.com/spf13/cobra"

	daemonlib "github.com/kuluruvineeth/openbeam/apps/cli/internal/daemon"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func newStopCommand() *cobra.Command {
	var home string
	var all bool
	var byCwd string

	cmd := &cobra.Command{
		Use:   "stop [agent-id]",
		Short: "Stop a running agent",
		Args:  cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			daemonHome := daemonlib.ResolveDaemonHome(home)
			client, err := daemonlib.NewClientFromState(cmd.Context(), daemonHome)
			if err != nil {
				return errs.New(errs.KindUnknown, "cannot connect to daemon", err)
			}

			if all {
				return stopAllAgents(cmd, client)
			}

			if byCwd != "" {
				return stopAgentsByCwd(cmd, client, byCwd)
			}

			if len(args) == 0 {
				return errs.New(errs.KindUsage, "provide an agent ID, --all, or --cwd", nil)
			}

			agentID, err := resolveAgentFromArg(cmd, client, args[0])
			if err != nil {
				return err
			}

			_, err = client.Post(cmd.Context(), fmt.Sprintf("/api/agents/%s/stop", agentID), nil)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to stop agent", err)
			}

			fmt.Fprintf(cmd.OutOrStdout(), "Agent %s stopped\n", agentID[:min(7, len(agentID))])
			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	cmd.Flags().BoolVar(&all, "all", false, "Stop all running agents")
	cmd.Flags().StringVar(&byCwd, "cwd", "", "Stop agents in directory")
	return cmd
}

func stopAllAgents(cmd *cobra.Command, client *daemonlib.Client) error {
	raw, err := client.Get(cmd.Context(), "/api/agents", nil)
	if err != nil {
		return errs.New(errs.KindUnknown, "failed to list agents", err)
	}

	var resp daemonlib.AgentListResponse
	if err := json.Unmarshal(raw, &resp); err != nil {
		return errs.New(errs.KindUnknown, "invalid response", err)
	}

	stopped := 0
	for _, entry := range resp.Entries {
		if entry.Agent.Status == "running" || entry.Agent.Status == "waiting" {
			_, err := client.Post(cmd.Context(), fmt.Sprintf("/api/agents/%s/stop", entry.Agent.ID), nil)
			if err != nil {
				fmt.Fprintf(cmd.ErrOrStderr(), "failed to stop %s: %v\n", entry.Agent.ID[:min(7, len(entry.Agent.ID))], err)
				continue
			}
			stopped++
		}
	}

	fmt.Fprintf(cmd.OutOrStdout(), "Stopped %d agent(s)\n", stopped)
	return nil
}

func stopAgentsByCwd(cmd *cobra.Command, client *daemonlib.Client, cwd string) error {
	query := url.Values{}
	query.Set("cwd", cwd)

	raw, err := client.Get(cmd.Context(), "/api/agents", query)
	if err != nil {
		return errs.New(errs.KindUnknown, "failed to list agents", err)
	}

	var resp daemonlib.AgentListResponse
	if err := json.Unmarshal(raw, &resp); err != nil {
		return errs.New(errs.KindUnknown, "invalid response", err)
	}

	stopped := 0
	for _, entry := range resp.Entries {
		if entry.Agent.Status == "running" || entry.Agent.Status == "waiting" {
			_, err := client.Post(cmd.Context(), fmt.Sprintf("/api/agents/%s/stop", entry.Agent.ID), nil)
			if err != nil {
				fmt.Fprintf(cmd.ErrOrStderr(), "failed to stop %s: %v\n", entry.Agent.ID[:min(7, len(entry.Agent.ID))], err)
				continue
			}
			stopped++
		}
	}

	fmt.Fprintf(cmd.OutOrStdout(), "Stopped %d agent(s) in %s\n", stopped, cwd)
	return nil
}
