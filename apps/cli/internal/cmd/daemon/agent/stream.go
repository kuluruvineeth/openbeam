package agent

import (
	"encoding/json"
	"fmt"
	"net/url"
	"time"

	"github.com/spf13/cobra"

	daemonlib "github.com/kuluruvineeth/openbeam/apps/cli/internal/daemon"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func streamTimeline(cmd *cobra.Command, client *daemonlib.Client, daemonHome string, agentID string, filter string) error {
	out := cmd.OutOrStdout()
	seen := 0

	for {
		query := url.Values{}
		query.Set("offset", fmt.Sprintf("%d", seen))

		raw, err := client.Get(cmd.Context(), fmt.Sprintf("/api/agents/%s/timeline", agentID), query)
		if err != nil {
			return errs.New(errs.KindUnknown, "failed to fetch timeline", err)
		}

		var resp daemonlib.TimelineResponse
		if err := json.Unmarshal(raw, &resp); err != nil {
			return errs.New(errs.KindUnknown, "invalid timeline response", err)
		}

		for _, entry := range resp.Entries {
			if !daemonlib.MatchesFilter(entry.Item, filter) {
				seen++
				continue
			}
			line := daemonlib.FormatTimelineItem(entry.Item)
			if line != "" {
				fmt.Fprintln(out, line)
			}
			seen++
		}

		snapshot, err := getAgentSnapshot(cmd, client, agentID)
		if err != nil {
			return err
		}
		if snapshot.Status == "idle" || snapshot.Status == "stopped" || snapshot.Status == "error" || snapshot.Status == "archived" {
			return nil
		}

		select {
		case <-cmd.Context().Done():
			return cmd.Context().Err()
		case <-time.After(500 * time.Millisecond):
		}
	}
}

func getAgentSnapshot(cmd *cobra.Command, client *daemonlib.Client, agentID string) (*daemonlib.AgentSnapshot, error) {
	raw, err := client.Get(cmd.Context(), fmt.Sprintf("/api/agents/%s", agentID), nil)
	if err != nil {
		return nil, errs.New(errs.KindUnknown, "failed to get agent", err)
	}

	var snapshot daemonlib.AgentSnapshot
	if err := json.Unmarshal(raw, &snapshot); err != nil {
		return nil, errs.New(errs.KindUnknown, "invalid agent response", err)
	}
	return &snapshot, nil
}
