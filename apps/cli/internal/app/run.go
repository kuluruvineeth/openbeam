package app

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/boot"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/plugin"
)

func Run(args []string) int {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	root, err := boot.NewRootCommand(ctx, os.Stdin, os.Stdout, os.Stderr)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return boot.MapErrorToExitCode(err).Int()
	}

	root.SetArgs(args)
	err = root.ExecuteContext(ctx)
	if err == nil {
		return 0
	}
	if isUnknownCommandError(err) {
		code, handled, dispatchErr := dispatchPlugin(ctx, args)
		if handled {
			if dispatchErr != nil {
				fmt.Fprintln(os.Stderr, dispatchErr)
				return boot.MapErrorToExitCode(dispatchErr).Int()
			}
			return code
		}
	}
	if code, ok := errs.ProcessExitCode(err); ok {
		return code
	}
	if !errors.Is(err, context.Canceled) {
		fmt.Fprintln(os.Stderr, err)
	}
	return boot.MapErrorToExitCode(err).Int()
}

func dispatchPlugin(ctx context.Context, args []string) (int, bool, error) {
	commandIndex := findCommandIndex(args)
	if commandIndex < 0 || commandIndex >= len(args) {
		return 0, false, nil
	}
	name := args[commandIndex]
	candidate, found, err := plugin.Lookup("openbeam", name, nil)
	if err != nil {
		return 0, false, nil
	}
	if !found {
		return 0, false, nil
	}

	installDir, dirErr := plugin.DefaultDir()
	if dirErr == nil {
		if verifyErr := plugin.VerifyInstalled(installDir, name, candidate.Path); verifyErr != nil {
			return 0, true, errs.New(errs.KindForbidden, verifyErr.Error(), verifyErr)
		}
	}

	code, err := plugin.Dispatch(ctx, candidate.Path, args[commandIndex+1:], plugin.Streams{
		In:  os.Stdin,
		Out: os.Stdout,
		Err: os.Stderr,
	})
	if err != nil {
		return 0, true, errs.New(errs.KindUnknown, "plugin execution failed", err)
	}
	return code, true, nil
}

func findCommandIndex(args []string) int {
	for i := 0; i < len(args); i++ {
		arg := strings.TrimSpace(args[i])
		if arg == "" {
			continue
		}
		if arg == "--" {
			if i+1 < len(args) {
				return i + 1
			}
			return -1
		}
		if strings.HasPrefix(arg, "--") {
			name := strings.TrimPrefix(arg, "--")
			if strings.Contains(name, "=") {
				continue
			}
			if expectsValue(name) && i+1 < len(args) {
				i++
			}
			continue
		}
		if strings.HasPrefix(arg, "-") {
			if arg == "-y" {
				continue
			}
		}
		return i
	}
	return -1
}

func expectsValue(name string) bool {
	switch name {
	case "profile", "host", "team", "output", "jq", "template", "color", "timeout":
		return true
	default:
		return false
	}
}

func isUnknownCommandError(err error) bool {
	return strings.Contains(err.Error(), "unknown command")
}
