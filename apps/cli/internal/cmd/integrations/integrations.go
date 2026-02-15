package integrations

import (
	"strings"

	"github.com/spf13/cobra"

	"github.com/openplane/openplane/apps/cli/internal/cmd/shared"
	"github.com/openplane/openplane/apps/cli/internal/errs"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "integrations",
		Short: "Integration authentication flows",
	}
	cmd.AddCommand(newOAuthStartCommand(provider))
	cmd.AddCommand(newOAuthCallbackCommand(provider))
	cmd.AddCommand(newServiceAccountAuthCommand(provider))
	return cmd
}

func newOAuthStartCommand(provider shared.RuntimeProvider) *cobra.Command {
	var integration string
	var connectorID string
	var workspaceID string
	var redirectURL string
	cmd := &cobra.Command{
		Use:   "oauth-start",
		Short: "Start OAuth flow",
		RunE: func(cmd *cobra.Command, args []string) error {
			name, err := normalizeIntegration(integration)
			if err != nil {
				return err
			}
			query := shared.QueryFromMap(map[string]string{
				"connectorId": connectorID,
				"workspaceId": workspaceID,
				"redirectUrl": redirectURL,
			})
			path := shared.Path("/integrations", name, "oauth", "start")
			return shared.GetAndRender(cmd.Context(), provider, "integrations oauth-start", path, query, true)
		},
	}
	cmd.Flags().StringVar(&integration, "integration", "", "Integration name (gmail, slack, etc.)")
	cmd.Flags().StringVar(&connectorID, "connector-id", "", "Connector identifier")
	cmd.Flags().StringVar(&workspaceID, "workspace-id", "", "Workspace identifier")
	cmd.Flags().StringVar(&redirectURL, "redirect-url", "", "OAuth redirect URL")
	_ = cmd.MarkFlagRequired("integration")
	_ = cmd.MarkFlagRequired("connector-id")
	return cmd
}

func newOAuthCallbackCommand(provider shared.RuntimeProvider) *cobra.Command {
	var integration string
	var code string
	var state string
	cmd := &cobra.Command{
		Use:   "oauth-callback",
		Short: "Complete OAuth flow",
		RunE: func(cmd *cobra.Command, args []string) error {
			name, err := normalizeIntegration(integration)
			if err != nil {
				return err
			}
			path := shared.Path("/integrations", name, "callback")
			body := map[string]string{"code": code, "state": state}
			return shared.PostMutationAndRender(cmd.Context(), provider, "integrations oauth-callback", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&integration, "integration", "", "Integration name (gmail, slack, etc.)")
	cmd.Flags().StringVar(&code, "code", "", "OAuth authorization code")
	cmd.Flags().StringVar(&state, "state", "", "OAuth state parameter")
	_ = cmd.MarkFlagRequired("integration")
	_ = cmd.MarkFlagRequired("code")
	_ = cmd.MarkFlagRequired("state")
	return cmd
}

func newServiceAccountAuthCommand(provider shared.RuntimeProvider) *cobra.Command {
	var integration string
	var connectorID string
	var credentials string
	var delegatedEmail string
	cmd := &cobra.Command{
		Use:   "service-account-auth",
		Short: "Authenticate Google service account connector",
		RunE: func(cmd *cobra.Command, args []string) error {
			name, err := normalizeIntegration(integration)
			if err != nil {
				return err
			}
			if name != "gmail" && name != "google-drive" {
				return errs.New(errs.KindUsage, "--integration must be gmail or google-drive", nil)
			}
			path := shared.Path("/integrations", name, "service-account", "auth")
			body := map[string]string{
				"connectorId":    connectorID,
				"credentials":    credentials,
				"delegatedEmail": delegatedEmail,
			}
			if credentials == "" {
				delete(body, "credentials")
			}
			if delegatedEmail == "" {
				delete(body, "delegatedEmail")
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "integrations service-account-auth", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&integration, "integration", "", "Integration name (gmail or google-drive)")
	cmd.Flags().StringVar(&connectorID, "connector-id", "", "Connector identifier")
	cmd.Flags().StringVar(&credentials, "credentials", "", "Service account credentials JSON")
	cmd.Flags().StringVar(&delegatedEmail, "delegated-email", "", "Delegated user email address")
	_ = cmd.MarkFlagRequired("integration")
	_ = cmd.MarkFlagRequired("connector-id")
	return cmd
}

func normalizeIntegration(value string) (string, error) {
	name := strings.ToLower(strings.TrimSpace(value))
	if name == "" {
		return "", errs.New(errs.KindUsage, "--integration is required", nil)
	}
	switch name {
	case "gmail", "google-drive", "linear", "notion", "slack":
		return name, nil
	default:
		return "", errs.New(errs.KindUsage, "--integration must be one of gmail|google-drive|linear|notion|slack", nil)
	}
}
