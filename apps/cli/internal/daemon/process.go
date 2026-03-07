package daemon

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
)

const (
	DefaultHost    = "127.0.0.1"
	DefaultPort    = 6868
	DefaultListen  = "127.0.0.1:6868"
	PidFileName    = "openbeam.pid"
	DaemonBinName  = "daemon"
	HealthTimeout  = 3 * time.Second
	StartupTimeout = 10 * time.Second
	StopTimeout    = 5 * time.Second
)

type PidLockInfo struct {
	PID       int    `json:"pid"`
	StartedAt string `json:"startedAt"`
	Hostname  string `json:"hostname"`
	UID       int    `json:"uid"`
	SockPath  string `json:"sockPath"`
}

type HealthResponse struct {
	Status   string  `json:"status"`
	ServerID string  `json:"serverId"`
	Version  string  `json:"version"`
	Uptime   float64 `json:"uptime"`
}

type DaemonState struct {
	Home    string
	Listen  string
	PidInfo *PidLockInfo
	Running bool
	Healthy bool
	Health  *HealthResponse
}

func DefaultHome() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return filepath.Join(os.TempDir(), ".openbeam")
	}
	return filepath.Join(home, ".openbeam")
}

func ResolveDaemonHome(explicit string) string {
	if explicit != "" {
		return explicit
	}
	if env := os.Getenv("OPENBEAM_DAEMON_HOME"); env != "" {
		return env
	}
	return DefaultHome()
}

func ResolveListen(explicit string) string {
	if explicit != "" {
		return explicit
	}
	if env := os.Getenv("OPENBEAM_LISTEN"); env != "" {
		return env
	}
	return DefaultListen
}

func ReadPidLock(daemonHome string) (*PidLockInfo, error) {
	path := filepath.Join(daemonHome, PidFileName)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("read pid file: %w", err)
	}

	var info PidLockInfo
	if err := json.Unmarshal(data, &info); err != nil {
		return nil, fmt.Errorf("parse pid file: %w", err)
	}
	return &info, nil
}

func CheckHealth(ctx context.Context, listen string) (*HealthResponse, error) {
	url := fmt.Sprintf("http://%s/health", listen)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: HealthTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("health check returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read health response: %w", err)
	}

	var health HealthResponse
	if err := json.Unmarshal(body, &health); err != nil {
		return nil, fmt.Errorf("parse health response: %w", err)
	}
	return &health, nil
}

func GetState(ctx context.Context, daemonHome string) (*DaemonState, error) {
	state := &DaemonState{Home: daemonHome}

	pidInfo, err := ReadPidLock(daemonHome)
	if err != nil {
		return state, err
	}
	state.PidInfo = pidInfo

	if pidInfo == nil {
		return state, nil
	}

	state.Listen = pidInfo.SockPath
	state.Running = IsPidRunning(pidInfo.PID)

	if !state.Running {
		return state, nil
	}

	health, err := CheckHealth(ctx, pidInfo.SockPath)
	if err == nil {
		state.Healthy = true
		state.Health = health
	}

	return state, nil
}

func FindDaemonBinary() (string, error) {
	bunPath, err := exec.LookPath("bun")
	if err == nil {
		return bunPath, nil
	}
	return "", fmt.Errorf("bun not found in PATH (required to run daemon)")
}

func WaitForReady(ctx context.Context, listen string, timeout time.Duration) error {
	deadline := time.After(timeout)
	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-deadline:
			return fmt.Errorf("daemon did not become ready within %s", timeout)
		case <-ticker.C:
			_, err := CheckHealth(ctx, listen)
			if err == nil {
				return nil
			}
		}
	}
}

func findDaemonEntry() string {
	candidates := []string{
		"apps/daemon/src/index.ts",
		"../daemon/src/index.ts",
	}

	cwd, _ := os.Getwd()
	for _, candidate := range candidates {
		abs := candidate
		if !filepath.IsAbs(candidate) {
			abs = filepath.Join(cwd, candidate)
		}
		if _, err := os.Stat(abs); err == nil {
			return abs
		}
	}

	home, _ := os.UserHomeDir()
	gopath := os.Getenv("GOPATH")
	if gopath == "" {
		gopath = filepath.Join(home, "go")
	}
	srcPath := filepath.Join(gopath, "src", "github.com", "openbeam", "openbeam", "apps", "daemon", "src", "index.ts")
	if _, err := os.Stat(srcPath); err == nil {
		return srcPath
	}

	return ""
}

func buildDaemonEnv(daemonHome string, listen string) []string {
	env := os.Environ()
	env = append(env,
		"OPENBEAM_DAEMON_HOME="+daemonHome,
		"OPENBEAM_LISTEN="+listen,
	)
	return env
}

func FormatUptime(seconds float64) string {
	d := time.Duration(seconds) * time.Second
	if d < time.Minute {
		return fmt.Sprintf("%ds", int(d.Seconds()))
	}
	if d < time.Hour {
		return fmt.Sprintf("%dm%ds", int(d.Minutes()), int(d.Seconds())%60)
	}
	hours := int(d.Hours())
	mins := int(d.Minutes()) % 60
	if hours < 24 {
		return fmt.Sprintf("%dh%dm", hours, mins)
	}
	days := hours / 24
	hours = hours % 24
	return fmt.Sprintf("%dd%dh", days, hours)
}

func FormatListenAddress(listen string) string {
	if strings.HasPrefix(listen, "/") || strings.HasPrefix(listen, ".") {
		return listen
	}

	parts := strings.SplitN(listen, ":", 2)
	if len(parts) == 2 {
		host := parts[0]
		port := parts[1]
		if host == "127.0.0.1" || host == "localhost" || host == "0.0.0.0" {
			return host + ":" + port
		}
		return listen
	}

	if _, err := strconv.Atoi(listen); err == nil {
		return DefaultHost + ":" + listen
	}

	return listen
}

func RuntimeArch() string {
	return runtime.GOOS + "/" + runtime.GOARCH
}
