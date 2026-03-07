package auth

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/api"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/shared"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "auth",
		Short: "Authentication commands",
	}
	cmd.AddCommand(newLoginCommand(provider))
	cmd.AddCommand(newLogoutCommand(provider))
	cmd.AddCommand(newStatusCommand(provider))
	cmd.AddCommand(newKeyCommand(provider))
	cmd.AddCommand(newTokenCommand(provider))
	return cmd
}

func newLoginCommand(provider shared.RuntimeProvider) *cobra.Command {
	var apiKey string
	var skipVerify bool
	cmd := &cobra.Command{
		Use:   "login",
		Short: "Store an API key for the active profile",
		RunE: func(cmd *cobra.Command, args []string) error {
			rt, err := provider()
			if err != nil {
				return err
			}
			if err := rt.RequireYesForNonInteractive(); err != nil {
				return err
			}
			if apiKey == "" {
				return errs.New(errs.KindUsage, "--api-key is required", nil)
			}

			if !skipVerify {
				verifyClient := api.NewClient(&http.Client{Timeout: 30 * time.Second}, rt.Profile.Host, apiKey)
				verifyClient.SetTeam(rt.Profile.Team)
				_, _, err := verifyClient.GetJSON(cmd.Context(), "/api/mcp/tools", nil)
				if err != nil {
					return err
				}
			}

			ref := rt.ProfileName + ":api_key"
			if err := rt.SecretStore.Set(ref, apiKey); err != nil {
				return err
			}
			cfg := rt.ConfigFile
			profile := cfg.Profiles[rt.ProfileName]
			profile.APIKeyRef = ref
			cfg.Profiles[rt.ProfileName] = profile
			if err := rt.ConfigStore.Save(cfg); err != nil {
				return err
			}

			result := map[string]any{
				"profile":  rt.ProfileName,
				"host":     rt.Profile.Host,
				"stored":   true,
				"verified": !skipVerify,
			}
			meta := api.Metadata{Host: rt.Profile.Host}
			return rt.WriteEnvelope("auth login", result, meta)
		},
	}
	cmd.Flags().StringVar(&apiKey, "api-key", "", "API key value")
	cmd.Flags().BoolVar(&skipVerify, "skip-verify", false, "Skip API key verification")
	return cmd
}

func newLogoutCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "logout",
		Short: "Remove API key for the active profile",
		RunE: func(cmd *cobra.Command, args []string) error {
			rt, err := provider()
			if err != nil {
				return err
			}
			if err := rt.RequireYesForNonInteractive(); err != nil {
				return err
			}
			cfg := rt.ConfigFile
			profile := cfg.Profiles[rt.ProfileName]
			if profile.APIKeyRef != "" {
				_ = rt.SecretStore.Delete(profile.APIKeyRef)
				profile.APIKeyRef = ""
				cfg.Profiles[rt.ProfileName] = profile
				if err := rt.ConfigStore.Save(cfg); err != nil {
					return err
				}
			}
			result := map[string]any{
				"profile":    rt.ProfileName,
				"logged_out": true,
			}
			return rt.WriteEnvelope("auth logout", result, api.Metadata{Host: rt.Profile.Host})
		},
	}
	return cmd
}

func newStatusCommand(provider shared.RuntimeProvider) *cobra.Command {
	var verify bool
	cmd := &cobra.Command{
		Use:   "status",
		Short: "Show auth status",
		RunE: func(cmd *cobra.Command, args []string) error {
			rt, err := provider()
			if err != nil {
				return err
			}
			source := "none"
			hasKey := false
			if os.Getenv("OPENBEAM_API_KEY") != "" {
				hasKey = true
				source = "env"
			} else if rt.Profile.APIKeyRef != "" {
				hasKey = rt.APIKey != ""
				source = "profile"
			}

			status := map[string]any{
				"profile":        rt.ProfileName,
				"host":           rt.Profile.Host,
				"team":           rt.Profile.Team,
				"has_api_key":    hasKey,
				"api_key_source": source,
			}
			if verify && hasKey {
				_, _, err := rt.Get(cmd.Context(), "/api/mcp/tools", nil)
				status["verified"] = err == nil
				if err != nil {
					status["verify_error"] = err.Error()
				}
			}
			return rt.WriteEnvelope("auth status", status, api.Metadata{Host: rt.Profile.Host})
		},
	}
	cmd.Flags().BoolVar(&verify, "verify", false, "Verify API key against server")
	return cmd
}

func newTokenCommand(provider shared.RuntimeProvider) *cobra.Command {
	command := &cobra.Command{
		Use:   "token",
		Short: "API key utilities",
	}
	command.AddCommand(newTokenPrintCommand(provider))
	return command
}

func newTokenPrintCommand(provider shared.RuntimeProvider) *cobra.Command {
	redact := true
	command := &cobra.Command{
		Use:   "print",
		Short: "Print the active API key",
		RunE: func(cmd *cobra.Command, args []string) error {
			rt, err := provider()
			if err != nil {
				return err
			}

			source := "none"
			token := ""
			if envValue := os.Getenv("OPENBEAM_API_KEY"); envValue != "" {
				source = "env"
				token = envValue
			} else if rt.Profile.APIKeyRef != "" && rt.APIKey != "" {
				source = "profile"
				token = rt.APIKey
			}

			if token == "" {
				return errs.New(errs.KindAuth, "no API key configured", nil)
			}

			outputToken := token
			if redact {
				outputToken = redactAPIKey(token)
			}

			result := map[string]any{
				"profile":  rt.ProfileName,
				"source":   source,
				"token":    outputToken,
				"redacted": redact,
			}
			return rt.WriteEnvelope("auth token print", result, api.Metadata{Host: rt.Profile.Host})
		},
	}
	command.Flags().BoolVar(&redact, "redact", true, "Redact token output")
	return command
}

func redactAPIKey(value string) string {
	if len(value) <= 8 {
		return "********"
	}
	return value[:4] + "..." + value[len(value)-4:]
}

func newKeyCommand(provider shared.RuntimeProvider) *cobra.Command {
	command := &cobra.Command{
		Use:   "key",
		Short: "API key lifecycle management",
	}
	command.AddCommand(newKeyListCommand(provider))
	command.AddCommand(newKeyCreateCommand(provider))
	command.AddCommand(newKeyRevokeCommand(provider))
	return command
}

func newKeyListCommand(provider shared.RuntimeProvider) *cobra.Command {
	var teamID string
	command := &cobra.Command{
		Use:   "list",
		Short: "List API keys for a team",
		RunE: func(cmd *cobra.Command, args []string) error {
			rt, err := provider()
			if err != nil {
				return err
			}
			if err := rt.RequireAPIKey(); err != nil {
				return err
			}

			resolvedTeamID, err := resolveTeamID(teamID, rt.Profile.Team)
			if err != nil {
				return err
			}

			path := shared.Path("/api/v1/teams", resolvedTeamID, "api-keys")
			result, meta, err := rt.Get(cmd.Context(), path, nil)
			if err != nil {
				return err
			}
			return rt.WriteEnvelope("auth key list", result, meta)
		},
	}
	command.Flags().StringVar(&teamID, "team-id", "", "Team identifier (defaults to active profile team)")
	return command
}

func newKeyCreateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var teamID string
	var name string
	var scopes []string
	var expiresAt string
	command := &cobra.Command{
		Use:   "create",
		Short: "Create an API key for a team",
		RunE: func(cmd *cobra.Command, args []string) error {
			rt, err := provider()
			if err != nil {
				return err
			}
			if err := rt.RequireAPIKey(); err != nil {
				return err
			}
			if err := rt.RequireYesForNonInteractive(); err != nil {
				return err
			}

			resolvedTeamID, err := resolveTeamID(teamID, rt.Profile.Team)
			if err != nil {
				return err
			}

			body := map[string]any{
				"name": name,
			}
			if len(scopes) > 0 {
				body["scopes"] = scopes
			}
			if expiresAt != "" {
				parsed, parseErr := time.Parse(time.RFC3339, expiresAt)
				if parseErr != nil {
					return errs.New(errs.KindUsage, "--expires-at must be RFC3339 (example: 2026-02-15T12:00:00Z)", parseErr)
				}
				body["expiresAt"] = parsed.UTC().Format(time.RFC3339)
			}

			path := shared.Path("/api/v1/teams", resolvedTeamID, "api-keys")
			result, meta, err := rt.Post(cmd.Context(), path, nil, body)
			if err != nil {
				return err
			}
			return rt.WriteEnvelope("auth key create", result, meta)
		},
	}
	command.Flags().StringVar(&teamID, "team-id", "", "Team identifier (defaults to active profile team)")
	command.Flags().StringVar(&name, "name", "", "API key name")
	command.Flags().StringSliceVar(&scopes, "scope", nil, "Scope value (repeat for multiple)")
	command.Flags().StringVar(&expiresAt, "expires-at", "", "Expiration time in RFC3339 format")
	_ = command.MarkFlagRequired("name")
	return command
}

func newKeyRevokeCommand(provider shared.RuntimeProvider) *cobra.Command {
	var teamID string
	var keyID string
	command := &cobra.Command{
		Use:   "revoke",
		Short: "Revoke an API key",
		RunE: func(cmd *cobra.Command, args []string) error {
			rt, err := provider()
			if err != nil {
				return err
			}
			if err := rt.RequireAPIKey(); err != nil {
				return err
			}
			if err := rt.RequireYesForNonInteractive(); err != nil {
				return err
			}

			resolvedTeamID, err := resolveTeamID(teamID, rt.Profile.Team)
			if err != nil {
				return err
			}

			path := shared.Path("/api/v1/teams", resolvedTeamID, "api-keys", keyID)
			result, meta, err := rt.Delete(cmd.Context(), path, nil)
			if err != nil {
				return err
			}
			return rt.WriteEnvelope("auth key revoke", result, meta)
		},
	}
	command.Flags().StringVar(&teamID, "team-id", "", "Team identifier (defaults to active profile team)")
	command.Flags().StringVar(&keyID, "id", "", "API key identifier")
	_ = command.MarkFlagRequired("id")
	return command
}

func resolveTeamID(flagTeamID string, profileTeamID string) (string, error) {
	teamID := strings.TrimSpace(flagTeamID)
	if teamID == "" {
		teamID = strings.TrimSpace(profileTeamID)
	}
	if teamID == "" {
		return "", errs.New(errs.KindUsage, "team is required: set --team-id or configure --team in profile", nil)
	}
	return teamID, nil
}
