package agent

import (
	"encoding/json"
	"fmt"
	"net/url"

	"github.com/spf13/cobra"

	daemonlib "github.com/kuluruvineeth/openbeam/apps/cli/internal/daemon"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func newLogsCommand() *cobra.Command {
	var home string
	var follow bool
	var tail int
	var filter string

	cmd := &cobra.Command{
		Use:   "logs <agent-id>",
		Short: "View agent timeline and logs",
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

			if follow {
				return streamTimeline(cmd, client, daemonHome, agentID, filter)
			}

			query := url.Values{}
			raw, err := client.Get(cmd.Context(), fmt.Sprintf("/api/agents/%s/timeline", agentID), query)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to fetch timeline", err)
			}

			var resp daemonlib.TimelineResponse
			if err := json.Unmarshal(raw, &resp); err != nil {
				return errs.New(errs.KindUnknown, "invalid timeline response", err)
			}

			var items []daemonlib.TimelineItem
			for _, entry := range resp.Entries {
				if daemonlib.MatchesFilter(entry.Item, filter) {
					items = append(items, entry.Item)
				}
			}

			out := cmd.OutOrStdout()
			fmt.Fprint(out, daemonlib.FormatTimeline(items, tail))
			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	cmd.Flags().BoolVarP(&follow, "follow", "f", false, "Stream logs in real time")
	cmd.Flags().IntVar(&tail, "tail", 0, "Show last N items (0 = all)")
	cmd.Flags().StringVar(&filter, "filter", "", "Filter timeline items (tools, text, errors)")
	return cmd
}
