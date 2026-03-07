package media

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
		"chapters":   true,
		"highlights": true,
		"transcript": true,
		"summary":    true,
		"metadata":   true,
		"regenerate": true,
		"ask":        true,
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

func TestBoolToString(t *testing.T) {
	if got := boolToString(true); got != "true" {
		t.Errorf("boolToString(true) = %q, want true", got)
	}
	if got := boolToString(false); got != "false" {
		t.Errorf("boolToString(false) = %q, want false", got)
	}
}

func TestChaptersCommandFlags(t *testing.T) {
	cmd := newChaptersCommand(nopProvider())
	if f := cmd.Flags().Lookup("vespa-id"); f == nil {
		t.Fatal("vespa-id flag not found")
	}
	if f := cmd.Flags().Lookup("force-refresh"); f == nil || f.DefValue != "false" {
		t.Error("expected force-refresh flag with default false")
	}
}

func TestRegenerateCommandFlags(t *testing.T) {
	cmd := newRegenerateCommand(nopProvider())
	required := []string{"vespa-id", "content-type"}
	for _, name := range required {
		if cmd.Flags().Lookup(name) == nil {
			t.Errorf("required flag --%s not found", name)
		}
	}
}

func TestAskCommandFlags(t *testing.T) {
	cmd := newAskCommand(nopProvider())
	required := []string{"media-id", "question"}
	for _, name := range required {
		if cmd.Flags().Lookup(name) == nil {
			t.Errorf("required flag --%s not found", name)
		}
	}
}

func TestMetadataCommandFlags(t *testing.T) {
	cmd := newMetadataCommand(nopProvider())
	if f := cmd.Flags().Lookup("vespa-id"); f == nil {
		t.Fatal("vespa-id flag not found")
	}
}
