package teams

import (
	"github.com/spf13/cobra"

	"github.com/openplane/openplane/apps/cli/internal/cmd/shared"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "teams",
		Short: "Team management",
	}
	cmd.AddCommand(newListCommand(provider))
	cmd.AddCommand(newCreateCommand(provider))
	cmd.AddCommand(newSwitchCommand(provider))
	cmd.AddCommand(newRoleCommand(provider))
	return cmd
}

func newListCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List teams",
		RunE: func(cmd *cobra.Command, args []string) error {
			return shared.GetAndRender(cmd.Context(), provider, "teams list", "/api/v1/teams", nil, true)
		},
	}
	return cmd
}

func newCreateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var name string
	var slug string
	cmd := &cobra.Command{
		Use:   "create",
		Short: "Create team",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]string{
				"name": name,
				"slug": slug,
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "teams create", "/api/v1/teams", nil, body, true)
		},
	}
	cmd.Flags().StringVar(&name, "name", "", "Team name")
	cmd.Flags().StringVar(&slug, "slug", "", "Team slug")
	_ = cmd.MarkFlagRequired("name")
	_ = cmd.MarkFlagRequired("slug")
	return cmd
}

func newSwitchCommand(provider shared.RuntimeProvider) *cobra.Command {
	var teamID string
	cmd := &cobra.Command{
		Use:   "switch",
		Short: "Switch active team",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/teams", teamID, "switch")
			return shared.PostMutationAndRender(cmd.Context(), provider, "teams switch", path, nil, map[string]any{}, true)
		},
	}
	cmd.Flags().StringVar(&teamID, "id", "", "Team identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newRoleCommand(provider shared.RuntimeProvider) *cobra.Command {
	var teamID string
	cmd := &cobra.Command{
		Use:   "role",
		Short: "Get role for a team",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/teams", teamID, "role")
			return shared.GetAndRender(cmd.Context(), provider, "teams role", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&teamID, "id", "", "Team identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}
