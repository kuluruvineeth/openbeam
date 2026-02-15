package runtime

import (
	"testing"
	"time"

	"github.com/openplane/openplane/apps/cli/internal/output"
)

func TestResolveTimeout(t *testing.T) {
	timeout, err := resolveTimeout("", 0)
	if err != nil {
		t.Fatal(err)
	}
	if timeout != 30*time.Second {
		t.Fatalf("unexpected default timeout: %s", timeout)
	}

	timeout, err = resolveTimeout("45s", time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if timeout != 45*time.Second {
		t.Fatalf("unexpected parsed timeout: %s", timeout)
	}

	_, err = resolveTimeout("invalid", time.Second)
	if err == nil {
		t.Fatal("expected invalid timeout error")
	}

	_, err = resolveTimeout("0s", time.Second)
	if err == nil {
		t.Fatal("expected zero timeout error")
	}
}

func TestResolveColor(t *testing.T) {
	if color := resolveColor("", "", false); color != "auto" {
		t.Fatalf("unexpected default color: %s", color)
	}
	if color := resolveColor("", "never", false); color != "never" {
		t.Fatalf("unexpected profile color: %s", color)
	}
	if color := resolveColor("always", "never", false); color != "always" {
		t.Fatalf("unexpected flag color: %s", color)
	}
	if color := resolveColor("", "always", true); color != "never" {
		t.Fatalf("unexpected no-color value: %s", color)
	}
	if color := resolveColor("invalid", "", false); color != "" {
		t.Fatalf("expected invalid color to be rejected: %s", color)
	}
}

func TestResolveColorNoColorEnvWhitespace(t *testing.T) {
	t.Setenv("NO_COLOR", " ")
	if color := resolveColor("", "always", false); color != "never" {
		t.Fatalf("expected NO_COLOR with whitespace to force never, got: %s", color)
	}
}

func TestResolveColorNoColorEnvEmpty(t *testing.T) {
	t.Setenv("NO_COLOR", "")
	if color := resolveColor("", "always", false); color != "never" {
		t.Fatalf("expected NO_COLOR empty to force never, got: %s", color)
	}
}

func TestResolveColorWithNoColorEnv(t *testing.T) {
	t.Setenv("NO_COLOR", "1")
	if color := resolveColor("", "always", false); color != "never" {
		t.Fatalf("expected NO_COLOR to force never, got: %s", color)
	}
}

func TestResolveFormat(t *testing.T) {
	if format := resolveFormat("json", "table", 0); format != output.FormatJSON {
		t.Fatalf("unexpected flag format: %s", format)
	}
	if format := resolveFormat("", "yaml", 0); format != output.FormatYAML {
		t.Fatalf("unexpected profile format: %s", format)
	}
}
