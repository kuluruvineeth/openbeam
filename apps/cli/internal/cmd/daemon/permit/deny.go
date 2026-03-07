package permit

import (
	"fmt"

	"github.com/spf13/cobra"

	daemonlib "github.com/kuluruvineeth/openbeam/apps/cli/internal/daemon"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func newDenyCommand() *cobra.Command {
	var home string
	var all bool
	var message string
	var interrupt bool

	cmd := &cobra.Command{
		Use:   "deny <agent-id> [permission-id]",
		Short: "Deny a pending permission request",
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
				return denyAllPermissions(cmd, client, agentID, message, interrupt)
			}

			if len(args) < 2 {
				return errs.New(errs.KindUsage, "provide a permission ID or use --all", nil)
			}

			resp := daemonlib.PermissionResponse{
				Behavior:  "deny",
				Message:   message,
				Interrupt: interrupt,
			}

			_, err = client.Post(cmd.Context(), fmt.Sprintf("/api/agents/%s/permissions/%s", agentID, args[1]), resp)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to deny permission", err)
			}

			fmt.Fprintf(cmd.OutOrStdout(), "Permission %s denied\n", args[1])
			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	cmd.Flags().BoolVar(&all, "all", false, "Deny all pending permissions")
	cmd.Flags().StringVar(&message, "message", "", "Denial reason")
	cmd.Flags().BoolVar(&interrupt, "interrupt", false, "Interrupt the agent")
	return cmd
}

func denyAllPermissions(cmd *cobra.Command, client *daemonlib.Client, agentID string, message string, interrupt bool) error {
	snapshot, err := getAgentSnapshot(cmd, client, agentID)
	if err != nil {
		return err
	}

	if len(snapshot.PendingPermissions) == 0 {
		fmt.Fprintln(cmd.OutOrStdout(), "No pending permissions")
		return nil
	}

	resp := daemonlib.PermissionResponse{
		Behavior:  "deny",
		Message:   message,
		Interrupt: interrupt,
	}

	denied := 0
	for _, perm := range snapshot.PendingPermissions {
		_, err := client.Post(cmd.Context(), fmt.Sprintf("/api/agents/%s/permissions/%s", agentID, perm.ID), resp)
		if err != nil {
			fmt.Fprintf(cmd.ErrOrStderr(), "failed to deny %s: %v\n", perm.ID, err)
			continue
		}
		denied++
	}

	fmt.Fprintf(cmd.OutOrStdout(), "Denied %d permission(s)\n", denied)
	return nil
}
