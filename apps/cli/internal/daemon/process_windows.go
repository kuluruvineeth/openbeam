//go:build windows

package daemon

import (
	"context"
	"fmt"
	"time"
)

func IsPidRunning(pid int) bool {
	return false
}

func StartDetached(daemonHome string, listen string) (int, error) {
	return 0, fmt.Errorf("daemon is not supported on Windows")
}

func StopGraceful(ctx context.Context, daemonHome string, timeout time.Duration) error {
	return fmt.Errorf("daemon is not supported on Windows")
}
