package completion

import (
	"bytes"
	"testing"

	"github.com/spf13/cobra"
)

func TestNewCommandValidShells(t *testing.T) {
	root := &cobra.Command{Use: "openplane"}
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
	root := &cobra.Command{Use: "openplane"}
	cmd := NewCommand(root)
	cmd.SetOut(&bytes.Buffer{})
	cmd.SetArgs([]string{"invalid"})
	if err := cmd.Execute(); err == nil {
		t.Fatal("expected error for unsupported shell")
	}
}

func TestNewCommandRequiresArg(t *testing.T) {
	root := &cobra.Command{Use: "openplane"}
	cmd := NewCommand(root)
	cmd.SetOut(&bytes.Buffer{})
	cmd.SetErr(&bytes.Buffer{})
	cmd.SetArgs([]string{})
	if err := cmd.Execute(); err == nil {
		t.Fatal("expected error for missing shell arg")
	}
}
