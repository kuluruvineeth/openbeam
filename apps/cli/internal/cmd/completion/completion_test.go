package completion

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/spf13/cobra"
)

func TestNewCommandValidShells(t *testing.T) {
	root := &cobra.Command{Use: "openbeam"}
	cmd := NewCommand(root)

	shells := []string{"bash", "zsh", "fish", "powershell"}
	for _, shell := range shells {
		t.Run(shell, func(t *testing.T) {
			buf := &bytes.Buffer{}
			cmd.SetOut(buf)
			cmd.SetArgs([]string{shell})
			if err := cmd.Execute(); err != nil {
				t.Fatalf("completion for %s failed: %v", shell, err)
			}
			if buf.Len() == 0 {
				t.Errorf("expected non-empty completion output for %s", shell)
			}
		})
	}
}

func TestNewCommandInvalidShell(t *testing.T) {
	root := &cobra.Command{Use: "openbeam"}
	cmd := NewCommand(root)
	cmd.SetOut(&bytes.Buffer{})
	cmd.SetArgs([]string{"invalid"})
	if err := cmd.Execute(); err == nil {
		t.Fatal("expected error for unsupported shell")
	}
}

func TestNewCommandNoArgsShowsHelp(t *testing.T) {
	root := &cobra.Command{Use: "openbeam"}
	cmd := NewCommand(root)
	buf := &bytes.Buffer{}
	cmd.SetOut(buf)
	cmd.SetErr(&bytes.Buffer{})
	cmd.SetArgs([]string{})
	if err := cmd.Execute(); err != nil {
		t.Fatalf("no-args should show help, got error: %v", err)
	}
	if !strings.Contains(buf.String(), "completion") {
		t.Errorf("help output missing command name:\n%s", buf.String())
	}
}

func TestIsSupported(t *testing.T) {
	for _, s := range []string{"bash", "zsh", "fish", "powershell"} {
		if !isSupported(s) {
			t.Errorf("%s should be supported", s)
		}
	}
	if isSupported("cmd") {
		t.Errorf("cmd should not be supported")
	}
}

func TestDetectShell(t *testing.T) {
	t.Setenv("SHELL", "/bin/zsh")
	if got := detectShell(); got != "zsh" {
		t.Errorf("detectShell = %q, want zsh", got)
	}
	t.Setenv("SHELL", "")
	if got := detectShell(); got != "" {
		t.Errorf("detectShell with no SHELL = %q, want empty", got)
	}
}

func TestDefaultCompletionPath(t *testing.T) {
	home, _ := os.UserHomeDir()
	t.Setenv("XDG_DATA_HOME", "")
	t.Setenv("XDG_CONFIG_HOME", "")

	cases := map[string]string{
		"bash": filepath.Join(home, ".local", "share", "bash-completion", "completions", "openbeam"),
		"zsh":  filepath.Join(home, ".zsh", "completions", "_openbeam"),
		"fish": filepath.Join(home, ".config", "fish", "completions", "openbeam.fish"),
	}
	for shell, want := range cases {
		got, err := defaultCompletionPath(shell)
		if err != nil {
			t.Errorf("%s: %v", shell, err)
			continue
		}
		if got != want {
			t.Errorf("%s path = %q, want %q", shell, got, want)
		}
	}

	t.Setenv("XDG_CONFIG_HOME", "/custom")
	got, err := defaultCompletionPath("fish")
	if err != nil {
		t.Fatal(err)
	}
	if got != "/custom/fish/completions/openbeam.fish" {
		t.Errorf("fish with XDG_CONFIG_HOME = %q", got)
	}
}

func TestDefaultCompletionPath_PowerShellRejects(t *testing.T) {
	if _, err := defaultCompletionPath("powershell"); err == nil {
		t.Fatal("expected error for powershell profile-specific hint")
	}
}

func TestInstallWritesFile(t *testing.T) {
	root := &cobra.Command{Use: "openbeam"}
	cmd := NewCommand(root)
	buf := &bytes.Buffer{}
	cmd.SetOut(buf)
	cmd.SetErr(&bytes.Buffer{})

	dest := filepath.Join(t.TempDir(), "_openbeam")
	cmd.SetArgs([]string{"install", "--shell", "zsh", "--path", dest, "--yes"})

	if err := cmd.Execute(); err != nil {
		t.Fatalf("install: %v", err)
	}
	data, err := os.ReadFile(dest)
	if err != nil {
		t.Fatalf("reading installed file: %v", err)
	}
	if !strings.Contains(string(data), "compdef _openbeam") {
		t.Errorf("installed file lacks zsh completion content:\n%s", data)
	}
	if !strings.Contains(buf.String(), "Installed") {
		t.Errorf("output should confirm install:\n%s", buf.String())
	}
}

func TestInstallPrintMode(t *testing.T) {
	root := &cobra.Command{Use: "openbeam"}
	cmd := NewCommand(root)
	buf := &bytes.Buffer{}
	cmd.SetOut(buf)
	cmd.SetErr(&bytes.Buffer{})

	cmd.SetArgs([]string{"install", "--shell", "bash", "--print"})
	if err := cmd.Execute(); err != nil {
		t.Fatalf("install --print: %v", err)
	}
	if !strings.Contains(buf.String(), "openbeam") {
		t.Errorf("print output lacks completion content:\n%s", buf.String())
	}
}

func TestInstallUnsupportedShell(t *testing.T) {
	root := &cobra.Command{Use: "openbeam"}
	cmd := NewCommand(root)
	cmd.SetOut(&bytes.Buffer{})
	cmd.SetErr(&bytes.Buffer{})

	cmd.SetArgs([]string{"install", "--shell", "tcsh"})
	if err := cmd.Execute(); err == nil {
		t.Fatal("expected error for unsupported shell")
	}
}
