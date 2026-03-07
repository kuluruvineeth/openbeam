package config

import (
	"sort"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/api"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/shared"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/output"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "config",
		Short: "Profile configuration",
	}
	cmd.AddCommand(newShowCommand(provider))
	cmd.AddCommand(newSetCommand(provider))
	cmd.AddCommand(newUseCommand(provider))
	cmd.AddCommand(newProfilesCommand(provider))
	return cmd
}

func newShowCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "show",
		Short: "Show active profile configuration",
		RunE: func(cmd *cobra.Command, args []string) error {
			rt, err := provider()
			if err != nil {
				return err
			}
			result := map[string]any{
				"profile":     rt.ProfileName,
				"host":        rt.Profile.Host,
				"team":        rt.Profile.Team,
				"output":      rt.Profile.Output,
				"color":       rt.Profile.Color,
				"timeout":     rt.Profile.Timeout.String(),
				"api_key_ref": rt.Profile.APIKeyRef,
			}
			return rt.WriteEnvelope("config show", result, api.Metadata{Host: rt.Profile.Host})
		},
	}
	return cmd
}

func newSetCommand(provider shared.RuntimeProvider) *cobra.Command {
	var host string
	var team string
	var outputFormat string
	var color string
	var timeout string
	cmd := &cobra.Command{
		Use:   "set",
		Short: "Set values on the active profile",
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
			if host != "" {
				profile.Host = host
			}
			if team != "" {
				profile.Team = team
			}
			if outputFormat != "" {
				format := parseOutputFormat(outputFormat)
				if !format.IsValid() {
					return errs.New(errs.KindUsage, "--output must be table|json|yaml|ndjson", nil)
				}
				profile.Output = string(format)
			}
			if color != "" {
				switch strings.ToLower(color) {
				case "auto", "always", "never":
					profile.Color = strings.ToLower(color)
				default:
					return errs.New(errs.KindUsage, "--color must be auto|always|never", nil)
				}
			}
			if timeout != "" {
				duration, err := time.ParseDuration(timeout)
				if err != nil {
					return errs.New(errs.KindUsage, "invalid --timeout value", err)
				}
				if duration <= 0 {
					return errs.New(errs.KindUsage, "--timeout must be greater than zero", nil)
				}
				profile.Timeout = duration
			}
			cfg.Profiles[rt.ProfileName] = profile
			if err := rt.ConfigStore.Save(cfg); err != nil {
				return err
			}
			result := map[string]any{
				"profile": rt.ProfileName,
				"host":    profile.Host,
				"team":    profile.Team,
				"output":  profile.Output,
				"color":   profile.Color,
				"timeout": profile.Timeout.String(),
			}
			return rt.WriteEnvelope("config set", result, api.Metadata{Host: profile.Host})
		},
	}
	cmd.Flags().StringVar(&host, "host", "", "API server host URL")
	cmd.Flags().StringVar(&team, "team", "", "Default team identifier")
	cmd.Flags().StringVar(&outputFormat, "output", "", "Output format (table, json, yaml, ndjson)")
	cmd.Flags().StringVar(&color, "color", "", "Color mode (auto, always, never)")
	cmd.Flags().StringVar(&timeout, "timeout", "", "Request timeout (e.g., 30s)")
	return cmd
}

func newUseCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "use <profile>",
		Short: "Switch active profile",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			rt, err := provider()
			if err != nil {
				return err
			}
			if err := rt.RequireYesForNonInteractive(); err != nil {
				return err
			}
			profileName := args[0]
			cfg := rt.ConfigFile
			if _, ok := cfg.Profiles[profileName]; !ok {
				return errs.New(errs.KindUsage, "profile not found", nil)
			}
			cfg.CurrentProfile = profileName
			if err := rt.ConfigStore.Save(cfg); err != nil {
				return err
			}
			result := map[string]any{
				"current_profile": profileName,
			}
			return rt.WriteEnvelope("config use", result, api.Metadata{Host: rt.Profile.Host})
		},
	}
	return cmd
}

func newProfilesCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "profiles",
		Short: "List available profiles",
		RunE: func(cmd *cobra.Command, args []string) error {
			rt, err := provider()
			if err != nil {
				return err
			}
			names := make([]string, 0, len(rt.ConfigFile.Profiles))
			for name := range rt.ConfigFile.Profiles {
				names = append(names, name)
			}
			sort.Strings(names)
			items := make([]map[string]any, 0, len(rt.ConfigFile.Profiles))
			for _, name := range names {
				profile := rt.ConfigFile.Profiles[name]
				items = append(items, map[string]any{
					"name":    name,
					"host":    profile.Host,
					"team":    profile.Team,
					"current": name == rt.ConfigFile.CurrentProfile,
				})
			}
			result := map[string]any{"items": items}
			return rt.WriteEnvelope("config profiles", result, api.Metadata{Host: rt.Profile.Host})
		},
	}
	return cmd
}

func parseOutputFormat(value string) output.Format {
	return output.Format(strings.ToLower(strings.TrimSpace(value)))
}
