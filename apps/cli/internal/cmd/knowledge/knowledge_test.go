package knowledge

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
		"list":      true,
		"search":    true,
		"get":       true,
		"relations": true,
		"panel":     true,
		"experts":   true,
		"expertise": true,
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

func TestSearchCommandFlags(t *testing.T) {
	cmd := newSearchCommand(nopProvider())
	if f := cmd.Flags().ShorthandLookup("q"); f == nil || f.Name != "query" {
		t.Error("expected -q shorthand for query flag")
	}
	if f := cmd.Flags().Lookup("type"); f == nil {
		t.Error("expected type flag")
	}
	if f := cmd.Flags().Lookup("limit"); f == nil || f.DefValue != "10" {
		t.Error("expected limit flag with default 10")
	}
}

func TestListCommandDefaults(t *testing.T) {
	cmd := newListCommand(nopProvider())
	if f := cmd.Flags().Lookup("type"); f == nil {
		t.Error("expected type flag")
	}
	if f := cmd.Flags().Lookup("cursor"); f == nil {
		t.Error("expected cursor flag")
	}
	if f := cmd.Flags().Lookup("limit"); f == nil || f.DefValue != "20" {
		t.Error("expected limit flag with default 20")
	}
}

func TestRelationsCommandFlags(t *testing.T) {
	cmd := newRelationsCommand(nopProvider())
	if f := cmd.Flags().Lookup("id"); f == nil {
		t.Fatal("id flag not found")
	}
	if f := cmd.Flags().Lookup("direction"); f == nil || f.DefValue != "both" {
		t.Error("expected direction flag with default both")
	}
}

func TestExpertsCommandFlags(t *testing.T) {
	cmd := newExpertsCommand(nopProvider())
	if f := cmd.Flags().Lookup("topic-id"); f == nil {
		t.Fatal("topic-id flag not found")
	}
	if f := cmd.Flags().Lookup("limit"); f == nil || f.DefValue != "10" {
		t.Error("expected limit flag with default 10")
	}
}

func TestExpertiseCommandFlags(t *testing.T) {
	cmd := newExpertiseCommand(nopProvider())
	if f := cmd.Flags().Lookup("person-id"); f == nil {
		t.Fatal("person-id flag not found")
	}
	if f := cmd.Flags().Lookup("limit"); f == nil || f.DefValue != "10" {
		t.Error("expected limit flag with default 10")
	}
}
