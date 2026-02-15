package agent

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
		"run":    true,
		"stream": true,
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

func TestRunCommandFlags(t *testing.T) {
	cmd := newRunCommand(nopProvider())
	defaults := map[string]string{
		"prompt":     "",
		"agent-type": "rag",
		"max-steps":  "10",
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

func TestRunCommandPromptShorthand(t *testing.T) {
	cmd := newRunCommand(nopProvider())
	f := cmd.Flags().ShorthandLookup("p")
	if f == nil {
		t.Fatal("expected -p shorthand for prompt flag")
	}
	if f.Name != "prompt" {
		t.Errorf("-p shorthand mapped to %q, want prompt", f.Name)
	}
}

func TestStreamCommandFlags(t *testing.T) {
	cmd := newStreamCommand(nopProvider())
	required := []string{"prompt", "agent-type", "max-steps"}
	for _, name := range required {
		if cmd.Flags().Lookup(name) == nil {
			t.Errorf("flag --%s not found on stream command", name)
		}
	}
}
