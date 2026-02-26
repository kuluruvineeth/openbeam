package permit

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"

	daemonlib "github.com/openplane/openplane/apps/cli/internal/daemon"
	"github.com/openplane/openplane/apps/cli/internal/errs"
)

func newAllowCommand() *cobra.Command {
	var home string
	var all bool
	var input string

	cmd := &cobra.Command{
		Use:   "allow <agent-id> [permission-id]",
		Short: "Allow a pending permission request",
		Args:  cobra.RangeArgs(1, 2),
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

			if all {
				return allowAllPermissions(cmd, client, agentID)
			}

			if len(args) < 2 {
				return errs.New(errs.KindUsage, "provide a permission ID or use --all", nil)
			}

			resp := daemonlib.PermissionResponse{Behavior: "allow"}
			if input != "" {
				updated, err := parseUpdatedInput(input)
				if err != nil {
					return err
				}
				resp.UpdatedInput = updated
			}

			_, err = client.Post(cmd.Context(), fmt.Sprintf("/api/agents/%s/permissions/%s", agentID, args[1]), resp)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to allow permission", err)
			}

			fmt.Fprintf(cmd.OutOrStdout(), "Permission %s allowed\n", args[1])
			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	cmd.Flags().BoolVar(&all, "all", false, "Allow all pending permissions")
	cmd.Flags().StringVar(&input, "input", "", "Updated input as JSON")
	return cmd
}

func allowAllPermissions(cmd *cobra.Command, client *daemonlib.Client, agentID string) error {
	snapshot, err := getAgentSnapshot(cmd, client, agentID)
	if err != nil {
		return err
	}

	if len(snapshot.PendingPermissions) == 0 {
		fmt.Fprintln(cmd.OutOrStdout(), "No pending permissions")
		return nil
	}

	resp := daemonlib.PermissionResponse{Behavior: "allow"}
	allowed := 0
	for _, perm := range snapshot.PendingPermissions {
		_, err := client.Post(cmd.Context(), fmt.Sprintf("/api/agents/%s/permissions/%s", agentID, perm.ID), resp)
		if err != nil {
			fmt.Fprintf(cmd.ErrOrStderr(), "failed to allow %s: %v\n", perm.ID, err)
			continue
		}
		allowed++
	}

	fmt.Fprintf(cmd.OutOrStdout(), "Allowed %d permission(s)\n", allowed)
	return nil
}

func resolveAgentFromArg(cmd *cobra.Command, client *daemonlib.Client, idOrPrefix string) (string, error) {
	raw, err := client.Get(cmd.Context(), "/api/agents", nil)
	if err != nil {
		return "", errs.New(errs.KindUnknown, "failed to list agents", err)
	}

	var resp daemonlib.AgentListResponse
	if err := json.Unmarshal(raw, &resp); err != nil {
		return "", errs.New(errs.KindUnknown, "invalid response", err)
	}

	var snapshots []daemonlib.AgentSnapshot
	for _, entry := range resp.Entries {
		snapshots = append(snapshots, entry.Agent)
	}

	match, err := daemonlib.ResolveAgentID(snapshots, idOrPrefix)
	if err != nil {
		return "", errs.New(errs.KindNotFound, err.Error(), nil)
	}
	return match.ID, nil
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

func parseUpdatedInput(raw string) (map[string]any, error) {
	var result map[string]any
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return nil, errs.New(errs.KindUsage, "invalid JSON for --input", err)
	}
	return result, nil
}
