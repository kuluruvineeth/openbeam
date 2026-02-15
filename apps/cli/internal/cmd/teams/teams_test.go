package teams

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
		"list":   true,
		"create": true,
		"switch": true,
		"role":   true,
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

func TestCreateCommandFlags(t *testing.T) {
	cmd := newCreateCommand(nopProvider())
	required := []string{"name", "slug"}
	for _, name := range required {
		f := cmd.Flags().Lookup(name)
		if f == nil {
			t.Errorf("required flag --%s not found", name)
		}
	}
}

func TestSwitchCommandFlags(t *testing.T) {
	cmd := newSwitchCommand(nopProvider())
	if f := cmd.Flags().Lookup("id"); f == nil {
		t.Fatal("id flag not found on switch command")
	}
}

func TestRoleCommandFlags(t *testing.T) {
	cmd := newRoleCommand(nopProvider())
	if f := cmd.Flags().Lookup("id"); f == nil {
		t.Fatal("id flag not found on role command")
	}
}
