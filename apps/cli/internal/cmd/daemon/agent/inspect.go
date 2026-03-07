package agent

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	daemonlib "github.com/kuluruvineeth/openbeam/apps/cli/internal/daemon"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func newInspectCommand() *cobra.Command {
	var home string

	cmd := &cobra.Command{
		Use:   "inspect <agent-id>",
		Short: "Show detailed agent information",
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
			fmt.Fprintf(out, "ID:         %s\n", snapshot.ID)
			fmt.Fprintf(out, "Title:      %s\n", snapshot.Title)
			fmt.Fprintf(out, "Status:     %s\n", snapshot.Status)
			fmt.Fprintf(out, "Provider:   %s\n", snapshot.Provider)
			fmt.Fprintf(out, "Model:      %s\n", snapshot.Model)
			fmt.Fprintf(out, "Mode:       %s\n", snapshot.CurrentModeID)
			fmt.Fprintf(out, "Cwd:        %s\n", snapshot.Cwd)
			fmt.Fprintf(out, "Created:    %s\n", snapshot.CreatedAt)
			fmt.Fprintf(out, "Updated:    %s\n", snapshot.UpdatedAt)

			if snapshot.ArchivedAt != "" {
				fmt.Fprintf(out, "Archived:   %s\n", snapshot.ArchivedAt)
			}

			if len(snapshot.Labels) > 0 {
				var labels []string
				for k, v := range snapshot.Labels {
					labels = append(labels, k+"="+v)
				}
				fmt.Fprintf(out, "Labels:     %s\n", strings.Join(labels, ", "))
			}

			if snapshot.LastUsage != nil {
				u := snapshot.LastUsage
				fmt.Fprintf(out, "\nUsage:\n")
				fmt.Fprintf(out, "  Input tokens:  %d\n", u.InputTokens)
				fmt.Fprintf(out, "  Output tokens: %d\n", u.OutputTokens)
				fmt.Fprintf(out, "  Cached tokens: %d\n", u.CachedInputTokens)
				fmt.Fprintf(out, "  Cost:          $%.4f\n", u.TotalCostUSD)
			}

			if snapshot.Capabilities != nil {
				c := snapshot.Capabilities
				fmt.Fprintf(out, "\nCapabilities:\n")
				fmt.Fprintf(out, "  Streaming:   %t\n", c.SupportsStreaming)
				fmt.Fprintf(out, "  Persistence: %t\n", c.SupportsSessionPersistence)
				fmt.Fprintf(out, "  Modes:       %t\n", c.SupportsDynamicModes)
				fmt.Fprintf(out, "  MCP:         %t\n", c.SupportsMcpServers)
			}

			if len(snapshot.AvailableModes) > 0 {
				fmt.Fprintf(out, "\nModes:\n")
				for _, m := range snapshot.AvailableModes {
					desc := ""
					if m.Description != "" {
						desc = " - " + m.Description
					}
					fmt.Fprintf(out, "  %s: %s%s\n", m.ID, m.Label, desc)
				}
			}

			if len(snapshot.PendingPermissions) > 0 {
				fmt.Fprintf(out, "\nPending permissions:\n")
				for _, p := range snapshot.PendingPermissions {
					fmt.Fprintf(out, "  [%s] %s: %s\n", p.ID, p.Name, p.Description)
				}
			}

			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	return cmd
}
