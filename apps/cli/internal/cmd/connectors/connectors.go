package connectors

import (
	"github.com/spf13/cobra"

	"github.com/openplane/openplane/apps/cli/internal/cmd/shared"
	"github.com/openplane/openplane/apps/cli/internal/errs"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "connectors",
		Short: "Connector operations",
	}
	cmd.AddCommand(newSyncCommand(provider))
	cmd.AddCommand(newStatusCommand(provider))
	cmd.AddCommand(newHistoryCommand(provider))
	cmd.AddCommand(newPauseCommand(provider))
	cmd.AddCommand(newResumeCommand(provider))
	cmd.AddCommand(newListCommand(provider))
	cmd.AddCommand(newGetCommand(provider))
	cmd.AddCommand(newConnectCommand(provider))
	cmd.AddCommand(newUpdateCommand(provider))
	cmd.AddCommand(newDisconnectCommand(provider))
	cmd.AddCommand(newResourcesCommand(provider))
	cmd.AddCommand(newResourceSyncCommand(provider))
	return cmd
}

func newSyncCommand(provider shared.RuntimeProvider) *cobra.Command {
	var connectorID string
	var syncType string
	cmd := &cobra.Command{
		Use:   "sync",
		Short: "Trigger connector sync",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]string{"type": syncType}
			path := shared.Path("/api/v1/connectors", connectorID, "sync")
			return shared.PostMutationAndRender(cmd.Context(), provider, "connectors sync", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&connectorID, "id", "", "Connector identifier")
	cmd.Flags().StringVar(&syncType, "type", "FULL", "Sync type")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newStatusCommand(provider shared.RuntimeProvider) *cobra.Command {
	var connectorID string
	cmd := &cobra.Command{
		Use:   "status",
		Short: "Get connector sync status",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/connectors", connectorID, "sync-status")
			return shared.GetAndRender(cmd.Context(), provider, "connectors status", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&connectorID, "id", "", "Connector identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newHistoryCommand(provider shared.RuntimeProvider) *cobra.Command {
	var connectorID string
	var limit int
	var offset int
	cmd := &cobra.Command{
		Use:   "history",
		Short: "Get connector sync history",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/connectors", connectorID, "sync-history")
			query := shared.QueryFromMap(map[string]string{
				"limit":  shared.IntToString(limit),
				"offset": shared.IntToString(offset),
			})
			return shared.GetAndRender(cmd.Context(), provider, "connectors history", path, query, true)
		},
	}
	cmd.Flags().StringVar(&connectorID, "id", "", "Connector identifier")
	cmd.Flags().IntVar(&limit, "limit", 20, "Page size")
	cmd.Flags().IntVar(&offset, "offset", 0, "Pagination offset")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newPauseCommand(provider shared.RuntimeProvider) *cobra.Command {
	var connectorID string
	cmd := &cobra.Command{
		Use:   "pause",
		Short: "Pause connector",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/connectors", connectorID, "pause")
			return shared.PostMutationAndRender(cmd.Context(), provider, "connectors pause", path, nil, map[string]any{}, true)
		},
	}
	cmd.Flags().StringVar(&connectorID, "id", "", "Connector identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newResumeCommand(provider shared.RuntimeProvider) *cobra.Command {
	var connectorID string
	cmd := &cobra.Command{
		Use:   "resume",
		Short: "Resume connector",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/connectors", connectorID, "resume")
			return shared.PostMutationAndRender(cmd.Context(), provider, "connectors resume", path, nil, map[string]any{}, true)
		},
	}
	cmd.Flags().StringVar(&connectorID, "id", "", "Connector identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newListCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List connector apps and installation status",
		RunE: func(cmd *cobra.Command, args []string) error {
			return shared.GetAndRender(cmd.Context(), provider, "connectors list", "/api/v1/apps/connectors", nil, true)
		},
	}
	return cmd
}

func newGetCommand(provider shared.RuntimeProvider) *cobra.Command {
	var connectorID string
	cmd := &cobra.Command{
		Use:   "get",
		Short: "Get connector details by app id or connector id",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/apps/connectors", connectorID)
			return shared.GetAndRender(cmd.Context(), provider, "connectors get", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&connectorID, "id", "", "App id or connector id")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newConnectCommand(provider shared.RuntimeProvider) *cobra.Command {
	var appID string
	var workspaceExternalID string
	var name string
	var connectorType string
	var authType string
	var configJSON string
	cmd := &cobra.Command{
		Use:   "connect",
		Short: "Create or update connector installation",
		RunE: func(cmd *cobra.Command, args []string) error {
			config, err := shared.ParseJSONObject(configJSON)
			if err != nil {
				return errs.New(errs.KindUsage, "invalid --config JSON", err)
			}
			body := map[string]any{
				"appId":               appID,
				"workspaceExternalId": workspaceExternalID,
				"name":                name,
				"type":                connectorType,
				"authType":            authType,
				"config":              config,
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "connectors connect", "/api/v1/apps/connectors", nil, body, true)
		},
	}
	cmd.Flags().StringVar(&appID, "app-id", "", "Connector app id")
	cmd.Flags().StringVar(&workspaceExternalID, "workspace-external-id", "", "Workspace external identifier")
	cmd.Flags().StringVar(&name, "name", "", "Connector display name")
	cmd.Flags().StringVar(&connectorType, "type", "SOURCE", "Connector type")
	cmd.Flags().StringVar(&authType, "auth-type", "OAUTH2", "Authentication type")
	cmd.Flags().StringVar(&configJSON, "config", "{}", "Connector config JSON object")
	_ = cmd.MarkFlagRequired("app-id")
	_ = cmd.MarkFlagRequired("workspace-external-id")
	_ = cmd.MarkFlagRequired("name")
	return cmd
}

func newUpdateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var connectorID string
	var configJSON string
	cmd := &cobra.Command{
		Use:   "update",
		Short: "Update connector settings",
		RunE: func(cmd *cobra.Command, args []string) error {
			config, err := shared.ParseJSONObject(configJSON)
			if err != nil {
				return errs.New(errs.KindUsage, "invalid --config JSON", err)
			}
			path := shared.Path("/api/v1/apps/connectors", connectorID)
			body := map[string]any{"config": config}
			return shared.PatchMutationAndRender(cmd.Context(), provider, "connectors update", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&connectorID, "id", "", "Connector identifier")
	cmd.Flags().StringVar(&configJSON, "config", "{}", "Connector config JSON object")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newDisconnectCommand(provider shared.RuntimeProvider) *cobra.Command {
	var connectorID string
	cmd := &cobra.Command{
		Use:   "disconnect",
		Short: "Schedule connector disconnection",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/apps/connectors", connectorID)
			return shared.DeleteMutationAndRender(cmd.Context(), provider, "connectors disconnect", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&connectorID, "id", "", "Connector identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newResourcesCommand(provider shared.RuntimeProvider) *cobra.Command {
	var connectorID string
	var search string
	var cursor string
	var limit int
	cmd := &cobra.Command{
		Use:   "resources",
		Short: "List connector resources",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/apps/connectors", connectorID, "resources")
			query := shared.QueryFromMap(map[string]string{
				"search": search,
				"cursor": cursor,
				"limit":  shared.IntToString(limit),
			})
			return shared.GetAndRender(cmd.Context(), provider, "connectors resources", path, query, true)
		},
	}
	cmd.Flags().StringVar(&connectorID, "id", "", "Connector identifier")
	cmd.Flags().StringVar(&search, "search", "", "Search filter")
	cmd.Flags().StringVar(&cursor, "cursor", "", "Pagination cursor")
	cmd.Flags().IntVar(&limit, "limit", 50, "Page size")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newResourceSyncCommand(provider shared.RuntimeProvider) *cobra.Command {
	var resourceID string
	var enabled bool
	cmd := &cobra.Command{
		Use:   "resource-sync",
		Short: "Toggle resource sync",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/apps/connectors/resources", resourceID)
			body := map[string]any{"syncEnabled": enabled}
			return shared.PatchMutationAndRender(cmd.Context(), provider, "connectors resource-sync", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&resourceID, "resource-id", "", "Resource identifier")
	cmd.Flags().BoolVar(&enabled, "enabled", true, "Whether syncing is enabled")
	_ = cmd.MarkFlagRequired("resource-id")
	return cmd
}
