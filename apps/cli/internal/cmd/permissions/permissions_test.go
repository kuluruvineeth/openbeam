package permissions

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
		"sync-status":   true,
		"sync-statuses": true,
		"invalidate":    true,
		"me":            true,
		"document":      true,
		"groups":        true,
		"scopes":        true,
		"stats":         true,
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

func TestInvalidateCommandFlags(t *testing.T) {
	cmd := newInvalidateCommand(nopProvider())
	if f := cmd.Flags().Lookup("scope"); f == nil || f.DefValue != "all" {
		t.Error("expected scope flag with default all")
	}
	if f := cmd.Flags().Lookup("user-id"); f == nil {
		t.Error("expected user-id flag")
	}
	if f := cmd.Flags().Lookup("connector-id"); f == nil {
		t.Error("expected connector-id flag")
	}
}

func TestSyncStatusCommandFlags(t *testing.T) {
	cmd := newSyncStatusCommand(nopProvider())
	if f := cmd.Flags().Lookup("connector-id"); f == nil {
		t.Fatal("connector-id flag not found")
	}
}

func TestGroupsCommandFlags(t *testing.T) {
	cmd := newGroupsCommand(nopProvider())
	if f := cmd.Flags().Lookup("user-id"); f == nil {
		t.Fatal("user-id flag not found")
	}
}

func TestScopesCommandFlags(t *testing.T) {
	cmd := newScopesCommand(nopProvider())
	if f := cmd.Flags().Lookup("user-id"); f == nil {
		t.Fatal("user-id flag not found")
	}
}

func TestDocumentCommandFlags(t *testing.T) {
	cmd := newDocumentCommand(nopProvider())
	if f := cmd.Flags().Lookup("document-id"); f == nil {
		t.Fatal("document-id flag not found")
	}
}
