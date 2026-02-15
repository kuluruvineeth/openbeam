package mission

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
		"list":        true,
		"create":      true,
		"get":         true,
		"update":      true,
		"start":       true,
		"pause":       true,
		"resume":      true,
		"cancel":      true,
		"spawn-agent": true,
		"broadcast":   true,
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
	defaults := map[string]string{
		"objective":              "",
		"budget-cents":           "0",
		"max-concurrent-runs":   "3",
		"heartbeat-interval-min": "0",
		"cron-schedule":          "",
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

func TestSpawnAgentCommandFlags(t *testing.T) {
	cmd := newSpawnAgentCommand(nopProvider())
	required := []string{"id", "name", "role"}
	for _, name := range required {
		if cmd.Flags().Lookup(name) == nil {
			t.Errorf("required flag --%s not found", name)
		}
	}
	if cmd.Flags().Lookup("task-id") == nil {
		t.Error("optional flag --task-id not found")
	}
	if cmd.Flags().Lookup("tool") == nil {
		t.Error("optional flag --tool not found")
	}
}

func TestBroadcastCommandFlags(t *testing.T) {
	cmd := newBroadcastCommand(nopProvider())
	required := []string{"id", "content"}
	for _, name := range required {
		if cmd.Flags().Lookup(name) == nil {
			t.Errorf("required flag --%s not found", name)
		}
	}
}

func TestListCommandDefaults(t *testing.T) {
	cmd := newListCommand(nopProvider())
	if f := cmd.Flags().Lookup("limit"); f == nil || f.DefValue != "20" {
		t.Error("expected limit flag with default 20")
	}
	if f := cmd.Flags().Lookup("offset"); f == nil || f.DefValue != "0" {
		t.Error("expected offset flag with default 0")
	}
}
