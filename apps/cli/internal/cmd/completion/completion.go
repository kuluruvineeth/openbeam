package completion

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

var supportedShells = []string{"bash", "zsh", "fish", "powershell"}

func NewCommand(root *cobra.Command) *cobra.Command {
	cmd := &cobra.Command{
		Use:       "completion [bash|zsh|fish|powershell]",
		Short:     "Generate shell completion script",
		Args:      cobra.MaximumNArgs(1),
		ValidArgs: supportedShells,
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args) == 0 {
				return cmd.Help()
			}
			return writeScript(root, args[0], cmd.OutOrStdout())
		},
	}
	cmd.AddCommand(newInstallCommand(root))
	return cmd
}

func newInstallCommand(root *cobra.Command) *cobra.Command {
	var (
		shellOverride string
		skipConfirm   bool
		printOnly     bool
		target        string
	)
	cmd := &cobra.Command{
		Use:   "install",
		Short: "Install shell completions for the current shell",
		Long:  "Generate the right completion script for your shell and write it to a location your shell auto-loads.",
		RunE: func(cmd *cobra.Command, args []string) error {
			shell := shellOverride
			if shell == "" {
				shell = detectShell()
			}
			if shell == "" {
				return errs.New(errs.KindUsage, "could not detect shell; pass --shell bash|zsh|fish", nil)
			}
			if !isSupported(shell) {
				return errs.New(errs.KindUsage, "unsupported shell: "+shell, nil)
			}

			if printOnly {
				return writeScript(root, shell, cmd.OutOrStdout())
			}

			destination := target
			if destination == "" {
				resolved, err := defaultCompletionPath(shell)
				if err != nil {
					return err
				}
				destination = resolved
			}

			out := cmd.OutOrStdout()
			fmt.Fprintf(out, "Shell:       %s\nDestination: %s\n\n", shell, destination)

			if !skipConfirm && !confirm(cmd, "Write completion script?") {
				fmt.Fprintln(out, "Cancelled.")
				return nil
			}

			if err := os.MkdirAll(filepath.Dir(destination), 0o755); err != nil {
				return errs.New(errs.KindUnknown, "creating completion dir", err)
			}
			f, err := os.Create(destination)
			if err != nil {
				return errs.New(errs.KindForbidden, "writing completion file", err)
			}
			if err := writeScript(root, shell, f); err != nil {
				f.Close()
				return err
			}
			if err := f.Close(); err != nil {
				return errs.New(errs.KindUnknown, "closing completion file", err)
			}

			fmt.Fprintf(out, "\nInstalled. Restart your shell or source the file to activate:\n  %s\n", sourceHint(shell, destination))
			return nil
		},
	}
	cmd.Flags().StringVar(&shellOverride, "shell", "", "override shell detection (bash|zsh|fish|powershell)")
	cmd.Flags().StringVar(&target, "path", "", "override installation path")
	cmd.Flags().BoolVar(&printOnly, "print", false, "print completion script to stdout instead of writing")
	cmd.Flags().BoolVarP(&skipConfirm, "yes", "y", false, "skip confirmation prompt")
	return cmd
}

func writeScript(root *cobra.Command, shell string, w io.Writer) error {
	switch shell {
	case "bash":
		return root.GenBashCompletionV2(w, true)
	case "zsh":
		return root.GenZshCompletion(w)
	case "fish":
		return root.GenFishCompletion(w, true)
	case "powershell":
		return root.GenPowerShellCompletionWithDesc(w)
	default:
		return errs.New(errs.KindUsage, "unsupported shell: "+shell, nil)
	}
}

func detectShell() string {
	sh := strings.TrimSpace(os.Getenv("SHELL"))
	if sh == "" {
		return ""
	}
	return filepath.Base(sh)
}

func isSupported(shell string) bool {
	for _, s := range supportedShells {
		if s == shell {
			return true
		}
	}
	return false
}

func defaultCompletionPath(shell string) (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", errs.New(errs.KindUnknown, "resolving home dir", err)
	}
	switch shell {
	case "bash":
		if xdg := strings.TrimSpace(os.Getenv("XDG_DATA_HOME")); xdg != "" {
			return filepath.Join(xdg, "bash-completion", "completions", "openbeam"), nil
		}
		return filepath.Join(home, ".local", "share", "bash-completion", "completions", "openbeam"), nil
	case "zsh":
		return filepath.Join(home, ".zsh", "completions", "_openbeam"), nil
	case "fish":
		if xdg := strings.TrimSpace(os.Getenv("XDG_CONFIG_HOME")); xdg != "" {
			return filepath.Join(xdg, "fish", "completions", "openbeam.fish"), nil
		}
		return filepath.Join(home, ".config", "fish", "completions", "openbeam.fish"), nil
	case "powershell":
		return "", errs.New(errs.KindUsage, "powershell completions are profile-specific; use 'openbeam completion powershell' and add the output to your $PROFILE", nil)
	default:
		return "", errs.New(errs.KindUsage, "unsupported shell: "+shell, nil)
	}
}

func sourceHint(shell, path string) string {
	switch shell {
	case "zsh":
		return fmt.Sprintf(`fpath=(%s $fpath); autoload -U compinit && compinit`, filepath.Dir(path))
	case "bash":
		return fmt.Sprintf("source %s", path)
	case "fish":
		return "exec fish"
	default:
		return "restart your shell"
	}
}

func confirm(cmd *cobra.Command, prompt string) bool {
	fmt.Fprintf(cmd.OutOrStdout(), "%s [y/N]: ", prompt)
	line, err := bufio.NewReader(cmd.InOrStdin()).ReadString('\n')
	if err != nil {
		return false
	}
	answer := strings.ToLower(strings.TrimSpace(line))
	return answer == "y" || answer == "yes"
}
