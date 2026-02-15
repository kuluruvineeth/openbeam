package rag

import (
	"testing"

	"github.com/openplane/openplane/apps/cli/internal/cmd/shared"
	"github.com/openplane/openplane/apps/cli/internal/runtime"
)

func nopProvider() shared.RuntimeProvider {
	return func() (*runtime.Runtime, error) {
		return &runtime.Runtime{}, nil
	}
}

func TestNewCommandSubcommands(t *testing.T) {
	cmd := NewCommand(nopProvider())
	want := map[string]bool{
		"ask":           true,
		"stream":        true,
		"conversations": true,
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

func TestAskCommandFlags(t *testing.T) {
	cmd := newAskCommand(nopProvider())
	defaults := map[string]string{
		"query":           "",
		"conversation-id": "",
		"model-id":        "",
		"temperature":     "0",
		"include-media":   "true",
		"source-id":       "",
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

func TestAskCommandQueryShorthand(t *testing.T) {
	cmd := newAskCommand(nopProvider())
	f := cmd.Flags().ShorthandLookup("q")
	if f == nil {
		t.Fatal("expected -q shorthand for query flag")
	}
	if f.Name != "query" {
		t.Errorf("-q shorthand mapped to %q, want query", f.Name)
	}
}

func TestConversationsSubcommands(t *testing.T) {
	cmd := newConversationsCommand(nopProvider())
	want := map[string]bool{
		"create": true,
		"list":   true,
		"get":    true,
		"delete": true,
	}
	for _, sub := range cmd.Commands() {
		if !want[sub.Use] {
			t.Errorf("unexpected conversations subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	for missing := range want {
		t.Errorf("missing conversations subcommand: %s", missing)
	}
}

func TestConversationsListDefaults(t *testing.T) {
	cmd := newConversationsListCommand(nopProvider())
	if f := cmd.Flags().Lookup("status"); f == nil || f.DefValue != "active" {
		t.Error("expected status flag with default active")
	}
	if f := cmd.Flags().Lookup("limit"); f == nil || f.DefValue != "20" {
		t.Error("expected limit flag with default 20")
	}
}
