package mcp

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
		"tools":     true,
		"resources": true,
		"prompts":   true,
		"serve":     true,
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

func TestDecodeArgs(t *testing.T) {
	result, err := decodeArgs(`{"key":"value"}`)
	if err != nil {
		t.Fatal(err)
	}
	if result["key"] != "value" {
		t.Errorf("expected key=value, got %v", result["key"])
	}

	result, err = decodeArgs("")
	if err != nil {
		t.Fatal(err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty map for empty input, got %v", result)
	}

	_, err = decodeArgs("{invalid")
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
}

func TestToolsSubcommands(t *testing.T) {
	cmd := newToolsCommand(nopProvider())
	subs := cmd.Commands()
	want := map[string]bool{"list": true, "call": true}
	for _, sub := range subs {
		if !want[sub.Use] {
			t.Errorf("unexpected tools subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	for missing := range want {
		t.Errorf("missing tools subcommand: %s", missing)
	}
}

func TestResourcesSubcommands(t *testing.T) {
	cmd := newResourcesCommand(nopProvider())
	subs := cmd.Commands()
	want := map[string]bool{"list": true, "read": true}
	for _, sub := range subs {
		if !want[sub.Use] {
			t.Errorf("unexpected resources subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	for missing := range want {
		t.Errorf("missing resources subcommand: %s", missing)
	}
}

func TestPromptsSubcommands(t *testing.T) {
	cmd := newPromptsCommand(nopProvider())
	subs := cmd.Commands()
	want := map[string]bool{"list": true, "get": true}
	for _, sub := range subs {
		if !want[sub.Use] {
			t.Errorf("unexpected prompts subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	for missing := range want {
		t.Errorf("missing prompts subcommand: %s", missing)
	}
}
