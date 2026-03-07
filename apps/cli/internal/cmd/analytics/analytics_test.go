package analytics

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
		"cost-breakdown":   true,
		"usage-trend":      true,
		"top-cost-drivers": true,
		"spreadsheets":     true,
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

func TestCostBreakdownCommandFlags(t *testing.T) {
	cmd := newCostBreakdownCommand(nopProvider())
	required := []string{"start-date", "end-date"}
	for _, name := range required {
		if cmd.Flags().Lookup(name) == nil {
			t.Errorf("required flag --%s not found", name)
		}
	}
	if cmd.Flags().Lookup("group-by") == nil {
		t.Error("expected group-by flag")
	}
}

func TestUsageTrendCommandFlags(t *testing.T) {
	cmd := newUsageTrendCommand(nopProvider())
	if f := cmd.Flags().Lookup("granularity"); f == nil || f.DefValue != "day" {
		t.Error("expected granularity flag with default day")
	}
}

func TestTopCostDriversCommandFlags(t *testing.T) {
	cmd := newTopCostDriversCommand(nopProvider())
	if f := cmd.Flags().Lookup("dimension"); f == nil || f.DefValue != "model" {
		t.Error("expected dimension flag with default model")
	}
	if f := cmd.Flags().Lookup("limit"); f == nil || f.DefValue != "10" {
		t.Error("expected limit flag with default 10")
	}
}

func TestSpreadsheetsSubcommands(t *testing.T) {
	cmd := newSpreadsheetsCommand(nopProvider())
	want := map[string]bool{
		"list":         true,
		"schema":       true,
		"generate-sql": true,
		"query":        true,
	}
	for _, sub := range cmd.Commands() {
		if !want[sub.Use] {
			t.Errorf("unexpected spreadsheets subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	for missing := range want {
		t.Errorf("missing spreadsheets subcommand: %s", missing)
	}
}

func TestSpreadsheetsQueryCommandFlags(t *testing.T) {
	cmd := newSpreadsheetsQueryCommand(nopProvider())
	defaults := map[string]string{
		"document-id": "",
		"sql":         "",
		"view-name":   "",
		"max-rows":    "1000",
		"timeout-ms":  "10000",
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
