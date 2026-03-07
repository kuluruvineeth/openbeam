package connectors

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
		"sync":          true,
		"status":        true,
		"history":       true,
		"pause":         true,
		"resume":        true,
		"list":          true,
		"get":           true,
		"connect":       true,
		"update":        true,
		"disconnect":    true,
		"resources":     true,
		"resource-sync": true,
	}
	for _, sub := range cmd.Commands() {
		if !want[sub.Use] {
			t.Errorf("unexpected subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	for missing := range want {
		t.Errorf("missing subcommand: %s", missing)
	}
}

func TestSyncCommandFlags(t *testing.T) {
	cmd := newSyncCommand(nopProvider())
	if f := cmd.Flags().Lookup("id"); f == nil {
		t.Fatal("id flag not found")
	}
	if f := cmd.Flags().Lookup("type"); f == nil || f.DefValue != "FULL" {
		t.Error("expected type flag with default FULL")
	}
}

func TestConnectCommandRequiredFlags(t *testing.T) {
	cmd := newConnectCommand(nopProvider())
	required := []string{"app-id", "workspace-external-id", "name"}
	for _, name := range required {
		f := cmd.Flags().Lookup(name)
		if f == nil {
			t.Errorf("required flag --%s not found", name)
		}
	}
}

func TestConnectCommandOptionalFlags(t *testing.T) {
	cmd := newConnectCommand(nopProvider())
	defaults := map[string]string{
		"type":      "SOURCE",
		"auth-type": "OAUTH2",
		"config":    "{}",
	}
	for name, want := range defaults {
		f := cmd.Flags().Lookup(name)
		if f == nil {
			t.Errorf("flag --%s not found", name)
			continue
		}
		if f.DefValue != want {
			t.Errorf("flag --%s default = %q, want %q", name, f.DefValue, want)
		}
	}
}

func TestResourcesCommandFlags(t *testing.T) {
	cmd := newResourcesCommand(nopProvider())
	if f := cmd.Flags().Lookup("search"); f == nil {
		t.Fatal("search flag not found")
	}
	if f := cmd.Flags().Lookup("cursor"); f == nil {
		t.Fatal("cursor flag not found")
	}
	if f := cmd.Flags().Lookup("limit"); f == nil || f.DefValue != "50" {
		t.Error("expected limit flag with default 50")
	}
}

func TestHistoryCommandDefaults(t *testing.T) {
	cmd := newHistoryCommand(nopProvider())
	if f := cmd.Flags().Lookup("limit"); f == nil || f.DefValue != "20" {
		t.Error("expected limit flag with default 20")
	}
	if f := cmd.Flags().Lookup("offset"); f == nil || f.DefValue != "0" {
		t.Error("expected offset flag with default 0")
	}
}
