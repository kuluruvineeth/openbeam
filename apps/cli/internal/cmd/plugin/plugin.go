package plugin

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/api"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/shared"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
	pluginruntime "github.com/kuluruvineeth/openbeam/apps/cli/internal/plugin"
)

const pluginPrefix = "openbeam"

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	command := &cobra.Command{
		Use:   "plugin",
		Short: "Manage CLI plugins",
	}
	command.AddCommand(newListCommand(provider))
	command.AddCommand(newInstallCommand(provider))
	command.AddCommand(newRunCommand(provider))
	return command
}

func newListCommand(provider shared.RuntimeProvider) *cobra.Command {
	var searchDirs []string
	command := &cobra.Command{
		Use:   "list",
		Short: "List installed and discoverable plugins",
		RunE: func(cmd *cobra.Command, args []string) error {
			rt, err := provider()
			if err != nil {
				return err
			}

			dirs := searchDirs
			if len(dirs) == 0 {
				dirs, err = pluginruntime.SearchDirs()
				if err != nil {
					return err
				}
			}

			candidates, err := pluginruntime.Discover(pluginPrefix, dirs)
			if err != nil {
				return err
			}

			result := map[string]any{
				"plugins":     candidates,
				"search_dirs": dirs,
				"count":       len(candidates),
			}
			return rt.WriteEnvelope("plugin list", result, api.Metadata{Host: rt.Profile.Host})
		},
	}
	command.Flags().StringSliceVar(&searchDirs, "search-dir", nil, "Directory used for plugin discovery")
	return command
}

func newInstallCommand(provider shared.RuntimeProvider) *cobra.Command {
	var name string
	var source string
	var dir string
	command := &cobra.Command{
		Use:   "install",
		Short: "Install a plugin binary from a local path",
		RunE: func(cmd *cobra.Command, args []string) error {
			rt, err := provider()
			if err != nil {
				return err
			}
			if err := rt.RequireYesForNonInteractive(); err != nil {
				return err
			}

			result, err := pluginruntime.InstallLocal(pluginPrefix, name, source, dir)
			if err != nil {
				return errs.New(errs.KindUsage, "plugin install failed", err)
			}

			payload := map[string]any{
				"name":      result.Name,
				"path":      result.Path,
				"installed": true,
			}
			return rt.WriteEnvelope("plugin install", payload, api.Metadata{Host: rt.Profile.Host})
		},
	}
	command.Flags().StringVar(&name, "name", "", "Plugin name")
	command.Flags().StringVar(&source, "source", "", "Local path to plugin executable")
	command.Flags().StringVar(&dir, "dir", "", "Target plugin directory")
	_ = command.MarkFlagRequired("name")
	_ = command.MarkFlagRequired("source")
	return command
}

func newRunCommand(provider shared.RuntimeProvider) *cobra.Command {
	var searchDirs []string
	command := &cobra.Command{
		Use:   "run <name> [args...]",
		Short: "Run a plugin command",
		Args:  cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			rt, err := provider()
			if err != nil {
				return err
			}

			name := args[0]
			dirs := searchDirs
			if len(dirs) == 0 {
				dirs, err = pluginruntime.SearchDirs()
				if err != nil {
					return err
				}
			}

			candidate, found, err := pluginruntime.Lookup(pluginPrefix, name, dirs)
			if err != nil {
				return errs.New(errs.KindUsage, "invalid plugin name", err)
			}
			if !found {
				return errs.New(errs.KindNotFound, fmt.Sprintf("plugin %q not found", name), nil)
			}

			installDir, dirErr := pluginruntime.DefaultDir()
			if dirErr == nil {
				if verifyErr := pluginruntime.VerifyInstalled(installDir, name, candidate.Path); verifyErr != nil {
					return errs.New(errs.KindForbidden, verifyErr.Error(), verifyErr)
				}
			}

			code, err := pluginruntime.Dispatch(cmd.Context(), candidate.Path, args[1:], pluginruntime.Streams{
				In:  rt.Streams.In,
				Out: rt.Streams.Out,
				Err: rt.Streams.Err,
			})
			if err != nil {
				return errs.New(errs.KindUnknown, "plugin execution failed", err)
			}
			if code != 0 {
				return errs.NewProcessExit(code)
			}
			return nil
		},
	}
	command.Flags().StringSliceVar(&searchDirs, "search-dir", nil, "Directory used for plugin discovery")
	return command
}
