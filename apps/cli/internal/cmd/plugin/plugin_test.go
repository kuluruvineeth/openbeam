package plugin

import (
	"testing"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/shared"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/runtime"
)

func nopProvider() shared.RuntimeProvider {
	return func() (*runtime.Runtime, error) {
		return &runtime.Runtime{}, nil
	}
}

func TestNewCommandSubcommands(t *testing.T) {
	cmd := NewCommand(nopProvider())
	want := map[string]bool{
		"list":    true,
		"install": true,
	}
	found := false
	for _, sub := range cmd.Commands() {
		if sub.Use == "run <name> [args...]" {
			found = true
			continue
		}
		if !want[sub.Use] {
			t.Errorf("unexpected subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	if !found {
		t.Error("missing run subcommand")
	}
	for missing := range want {
		t.Errorf("missing subcommand: %s", missing)
	}
}

func TestInstallCommandFlags(t *testing.T) {
	cmd := newInstallCommand(nopProvider())
	required := []string{"name", "source"}
	for _, name := range required {
		if cmd.Flags().Lookup(name) == nil {
			t.Errorf("required flag --%s not found", name)
		}
	}
	if cmd.Flags().Lookup("dir") == nil {
		t.Error("optional flag --dir not found")
	}
}

func TestRunCommandArgs(t *testing.T) {
	cmd := newRunCommand(nopProvider())
	if cmd.Args == nil {
		t.Fatal("expected Args validator on run command")
	}
}

func TestListCommandFlags(t *testing.T) {
	cmd := newListCommand(nopProvider())
	if cmd.Flags().Lookup("search-dir") == nil {
		t.Error("search-dir flag not found")
	}
}

func TestPluginPrefix(t *testing.T) {
	if pluginPrefix != "openbeam" {
		t.Errorf("pluginPrefix = %q, want openbeam", pluginPrefix)
	}
}
