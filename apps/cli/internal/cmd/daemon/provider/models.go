package provider

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"

	daemonlib "github.com/openplane/openplane/apps/cli/internal/daemon"
	"github.com/openplane/openplane/apps/cli/internal/errs"
)

func newModelsCommand() *cobra.Command {
	var home string
	var providerID string

	cmd := &cobra.Command{
		Use:   "models",
		Short: "List models for a provider",
		RunE: func(cmd *cobra.Command, args []string) error {
			daemonHome := daemonlib.ResolveDaemonHome(home)
			client, err := daemonlib.NewClientFromState(cmd.Context(), daemonHome)
			if err != nil {
				return errs.New(errs.KindUnknown, "cannot connect to daemon", err)
			}

			raw, err := client.Get(cmd.Context(), fmt.Sprintf("/api/providers/%s/models", providerID), nil)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to list models", err)
			}

			var resp daemonlib.ProviderModelsResponse
			if err := json.Unmarshal(raw, &resp); err != nil {
				return errs.New(errs.KindUnknown, "invalid models response", err)
			}

			if resp.Error != "" {
				return errs.New(errs.KindUnknown, resp.Error, nil)
			}

			out := cmd.OutOrStdout()
			if len(resp.Models) == 0 {
				fmt.Fprintf(out, "No models available for provider %s\n", providerID)
				return nil
			}

			for _, m := range resp.Models {
				desc := ""
				if m.Description != "" {
					desc = "\t" + m.Description
				}
				fmt.Fprintf(out, "%s\t%s%s\n", m.ID, m.Label, desc)
			}
			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	cmd.Flags().StringVar(&providerID, "provider", "claude", "Provider ID")
	return cmd
}
