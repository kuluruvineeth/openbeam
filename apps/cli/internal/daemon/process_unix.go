//go:build !windows

package daemon

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"time"
)

func IsPidRunning(pid int) bool {
	if pid <= 0 {
		return false
	}
	proc, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	err = proc.Signal(syscall.Signal(0))
	return err == nil
}

func StartDetached(daemonHome string, listen string) (int, error) {
	if err := os.MkdirAll(daemonHome, 0o755); err != nil {
		return 0, fmt.Errorf("create daemon home: %w", err)
	}

	bunPath, err := FindDaemonBinary()
	if err != nil {
		return 0, err
	}

	daemonEntry := findDaemonEntry()
	if daemonEntry == "" {
		return 0, fmt.Errorf("daemon source not found; ensure apps/daemon exists in the project")
	}

	cmd := exec.Command(bunPath, "run", "--hot", daemonEntry)
	cmd.Env = buildDaemonEnv(daemonHome, listen)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Stdin = nil
	cmd.Stdout = nil
	cmd.Stderr = nil

	if err := cmd.Start(); err != nil {
		return 0, fmt.Errorf("start daemon: %w", err)
	}

	pid := cmd.Process.Pid
	if err := cmd.Process.Release(); err != nil {
		return pid, fmt.Errorf("release daemon process: %w", err)
	}

	return pid, nil
}

func StopGraceful(ctx context.Context, daemonHome string, timeout time.Duration) error {
	pidInfo, err := ReadPidLock(daemonHome)
	if err != nil {
		return err
	}
	if pidInfo == nil {
		return fmt.Errorf("no daemon is running (no pid file found)")
	}

	if !IsPidRunning(pidInfo.PID) {
		_ = os.Remove(filepath.Join(daemonHome, PidFileName))
		return fmt.Errorf("daemon process %d is not running (stale pid file cleaned)", pidInfo.PID)
	}

	proc, err := os.FindProcess(pidInfo.PID)
	if err != nil {
		return fmt.Errorf("find process %d: %w", pidInfo.PID, err)
	}

	if err := proc.Signal(syscall.SIGTERM); err != nil {
		return fmt.Errorf("send SIGTERM to %d: %w", pidInfo.PID, err)
	}

	deadline := time.After(timeout)
	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-deadline:
			if err := proc.Signal(syscall.SIGKILL); err != nil {
				return fmt.Errorf("force kill %d: %w", pidInfo.PID, err)
			}
			return nil
		case <-ticker.C:
			if !IsPidRunning(pidInfo.PID) {
				return nil
			}
		}
	}
}
