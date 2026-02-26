package agent

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"github.com/spf13/cobra"

	daemonlib "github.com/openplane/openplane/apps/cli/internal/daemon"
	"github.com/openplane/openplane/apps/cli/internal/errs"
)

func newLsCommand() *cobra.Command {
	var home string
	var all bool
	var label string
	var global bool

	cmd := &cobra.Command{
		Use:   "ls",
		Short: "List agents managed by the daemon",
		RunE: func(cmd *cobra.Command, args []string) error {
			daemonHome := daemonlib.ResolveDaemonHome(home)
			client, err := daemonlib.NewClientFromState(cmd.Context(), daemonHome)
			if err != nil {
				return errs.New(errs.KindUnknown, "cannot connect to daemon", err)
			}

			query := url.Values{}
			if all {
				query.Set("all", "true")
			}
			if label != "" {
				query.Set("label", label)
			}
			if global {
				query.Set("global", "true")
			}

			raw, err := client.Get(cmd.Context(), "/api/agents", query)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to list agents", err)
			}

			var resp daemonlib.AgentListResponse
			if err := json.Unmarshal(raw, &resp); err != nil {
				return errs.New(errs.KindUnknown, "invalid agent list response", err)
			}

			out := cmd.OutOrStdout()
			if len(resp.Entries) == 0 {
				fmt.Fprintln(out, "No agents found")
				return nil
			}

			for _, entry := range resp.Entries {
				a := entry.Agent
				id := a.ID
				if len(id) > 7 {
					id = id[:7]
				}
				status := a.Status
				title := a.Title
				if title == "" {
					title = "(untitled)"
				}
				parts := []string{id, status, a.Provider + "/" + a.Model, title}
				if a.CurrentModeID != "" {
					parts = append(parts, "["+a.CurrentModeID+"]")
				}
				if len(a.Labels) > 0 {
					var labels []string
					for k, v := range a.Labels {
						labels = append(labels, k+"="+v)
					}
					parts = append(parts, strings.Join(labels, ","))
				}
				fmt.Fprintln(out, strings.Join(parts, "\t"))
			}
			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	cmd.Flags().BoolVar(&all, "all", false, "Include archived agents")
	cmd.Flags().StringVar(&label, "label", "", "Filter by label (key=value)")
	cmd.Flags().BoolVar(&global, "global", false, "Show agents from all directories")
	return cmd
}
