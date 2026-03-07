package permissions

import (
	"github.com/spf13/cobra"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/shared"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "permissions",
		Short: "Permission and access controls",
	}
	cmd.AddCommand(newSyncStatusCommand(provider))
	cmd.AddCommand(newSyncStatusesCommand(provider))
	cmd.AddCommand(newInvalidateCommand(provider))
	cmd.AddCommand(newMeCommand(provider))
	cmd.AddCommand(newDocumentCommand(provider))
	cmd.AddCommand(newGroupsCommand(provider))
	cmd.AddCommand(newScopesCommand(provider))
	cmd.AddCommand(newStatsCommand(provider))
	return cmd
}

func newSyncStatusCommand(provider shared.RuntimeProvider) *cobra.Command {
	var connectorID string
	cmd := &cobra.Command{
		Use:   "sync-status",
		Short: "Get permission sync status",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/permissions/sync-status", connectorID)
			return shared.GetAndRender(cmd.Context(), provider, "permissions sync-status", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&connectorID, "connector-id", "", "Connector identifier")
	_ = cmd.MarkFlagRequired("connector-id")
	return cmd
}

func newSyncStatusesCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "sync-statuses",
		Short: "List permission sync statuses",
		RunE: func(cmd *cobra.Command, args []string) error {
			return shared.GetAndRender(cmd.Context(), provider, "permissions sync-statuses", "/api/v1/permissions/sync-statuses", nil, true)
		},
	}
	return cmd
}

func newInvalidateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var scope string
	var userID string
	var connectorID string
	cmd := &cobra.Command{
		Use:   "invalidate",
		Short: "Invalidate permission cache",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{"scope": scope}
			if userID != "" {
				body["userId"] = userID
			}
			if connectorID != "" {
				body["connectorId"] = connectorID
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "permissions invalidate", "/api/v1/permissions/cache/invalidate", nil, body, true)
		},
	}
	cmd.Flags().StringVar(&scope, "scope", "all", "Invalidation scope: user|connector|all")
	cmd.Flags().StringVar(&userID, "user-id", "", "User identifier")
	cmd.Flags().StringVar(&connectorID, "connector-id", "", "Connector identifier")
	return cmd
}

func newMeCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "me",
		Short: "Get current permission set",
		RunE: func(cmd *cobra.Command, args []string) error {
			return shared.GetAndRender(cmd.Context(), provider, "permissions me", "/api/v1/permissions/me", nil, true)
		},
	}
	return cmd
}

func newDocumentCommand(provider shared.RuntimeProvider) *cobra.Command {
	var documentID string
	cmd := &cobra.Command{
		Use:   "document",
		Short: "Get document permissions",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/permissions/documents", documentID)
			return shared.GetAndRender(cmd.Context(), provider, "permissions document", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&documentID, "document-id", "", "Document identifier")
	_ = cmd.MarkFlagRequired("document-id")
	return cmd
}

func newGroupsCommand(provider shared.RuntimeProvider) *cobra.Command {
	var userID string
	cmd := &cobra.Command{
		Use:   "groups",
		Short: "Get user group memberships",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{"userId": userID})
			return shared.GetAndRender(cmd.Context(), provider, "permissions groups", "/api/v1/permissions/users/groups", query, true)
		},
	}
	cmd.Flags().StringVar(&userID, "user-id", "", "User identifier")
	return cmd
}

func newScopesCommand(provider shared.RuntimeProvider) *cobra.Command {
	var userID string
	cmd := &cobra.Command{
		Use:   "scopes",
		Short: "Get user connector scopes",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{"userId": userID})
			return shared.GetAndRender(cmd.Context(), provider, "permissions scopes", "/api/v1/permissions/users/scopes", query, true)
		},
	}
	cmd.Flags().StringVar(&userID, "user-id", "", "User identifier")
	return cmd
}

func newStatsCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "stats",
		Short: "Get team permission stats",
		RunE: func(cmd *cobra.Command, args []string) error {
			return shared.GetAndRender(cmd.Context(), provider, "permissions stats", "/api/v1/permissions/stats", nil, true)
		},
	}
	return cmd
}
