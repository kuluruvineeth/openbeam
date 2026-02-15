package search

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
		"query":   true,
		"recent":  true,
		"thread":  true,
		"similar": true,
		"author":  true,
		"media":   true,
		"unified": true,
		"hybrid":  true,
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

func TestQueryCommandFlags(t *testing.T) {
	cmd := newQueryCommand(nopProvider())
	flags := []struct {
		name     string
		defValue string
	}{
		{"query", ""},
		{"connector-type", "[]"},
		{"connector-id", ""},
		{"document-type", "[]"},
		{"source-type", "[]"},
		{"status", "[]"},
		{"priority", "[]"},
		{"label", "[]"},
		{"author-id", ""},
		{"source-id", ""},
		{"from-date", "0"},
		{"to-date", "0"},
		{"limit", "20"},
		{"offset", "0"},
		{"ranking", "hybrid"},
	}
	for _, tc := range flags {
		f := cmd.Flags().Lookup(tc.name)
		if f == nil {
			t.Errorf("flag --%s not found", tc.name)
			continue
		}
		if f.DefValue != tc.defValue {
			t.Errorf("flag --%s default = %q, want %q", tc.name, f.DefValue, tc.defValue)
		}
	}
}

func TestHybridCommandFlags(t *testing.T) {
	cmd := newHybridCommand(nopProvider())
	required := []string{"query", "mode", "rrf-k", "weight-bm25", "weight-dense", "weight-sparse"}
	for _, name := range required {
		if cmd.Flags().Lookup(name) == nil {
			t.Errorf("flag --%s not found on hybrid command", name)
		}
	}
}

func TestRecentCommandDefaults(t *testing.T) {
	cmd := newRecentCommand(nopProvider())
	if f := cmd.Flags().Lookup("hours"); f == nil || f.DefValue != "24" {
		t.Error("expected hours flag with default 24")
	}
	if f := cmd.Flags().Lookup("limit"); f == nil || f.DefValue != "20" {
		t.Error("expected limit flag with default 20")
	}
}

func TestThreadCommandRequiresThreadID(t *testing.T) {
	cmd := newThreadCommand(nopProvider())
	f := cmd.Flags().Lookup("thread-id")
	if f == nil {
		t.Fatal("thread-id flag not found")
	}
}

func TestSimilarCommandRequiresDocumentID(t *testing.T) {
	cmd := newSimilarCommand(nopProvider())
	f := cmd.Flags().Lookup("document-id")
	if f == nil {
		t.Fatal("document-id flag not found")
	}
}
