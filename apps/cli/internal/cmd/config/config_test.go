package config

import (
	"testing"

	"github.com/openplane/openplane/apps/cli/internal/cmd/shared"
	"github.com/openplane/openplane/apps/cli/internal/output"
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
		"show":     true,
		"set":      true,
		"profiles": true,
	}
	found := false
	for _, sub := range cmd.Commands() {
		if sub.Use == "use <profile>" {
			found = true
			continue
		}
		if !want[sub.Use] {
			t.Errorf("unexpected subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	if !found {
		t.Error("missing use subcommand")
	}
	for missing := range want {
		t.Errorf("missing subcommand: %s", missing)
	}
}

func TestParseOutputFormat(t *testing.T) {
	tests := []struct {
		input string
		want  output.Format
		valid bool
	}{
		{"json", output.FormatJSON, true},
		{"JSON", output.FormatJSON, true},
		{" yaml ", output.FormatYAML, true},
		{"table", output.FormatTable, true},
		{"ndjson", output.FormatNDJSON, true},
		{"invalid", output.Format("invalid"), false},
	}
	for _, tc := range tests {
		got := parseOutputFormat(tc.input)
		if got != tc.want {
			t.Errorf("parseOutputFormat(%q) = %q, want %q", tc.input, got, tc.want)
		}
		if tc.valid && !got.IsValid() {
			t.Errorf("parseOutputFormat(%q) should be valid", tc.input)
		}
		if !tc.valid && got.IsValid() {
			t.Errorf("parseOutputFormat(%q) should be invalid", tc.input)
		}
	}
}

func TestSetCommandFlags(t *testing.T) {
	cmd := newSetCommand(nopProvider())
	flags := []string{"host", "team", "output", "color", "timeout"}
	for _, name := range flags {
		if cmd.Flags().Lookup(name) == nil {
			t.Errorf("flag --%s not found on set command", name)
		}
	}
}

func TestUseCommandArgs(t *testing.T) {
	cmd := newUseCommand(nopProvider())
	if cmd.Args == nil {
		t.Fatal("expected Args validator on use command")
	}
}
