package daemon

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestDefaultHome(t *testing.T) {
	home := DefaultHome()
	if home == "" {
		t.Fatal("DefaultHome returned empty string")
	}
	if !filepath.IsAbs(home) {
		t.Errorf("DefaultHome returned non-absolute path: %s", home)
	}
}

func TestResolveDaemonHome(t *testing.T) {
	t.Run("explicit wins", func(t *testing.T) {
		result := ResolveDaemonHome("/custom/path")
		if result != "/custom/path" {
			t.Errorf("expected /custom/path, got %s", result)
		}
	})

	t.Run("env fallback", func(t *testing.T) {
		t.Setenv("OPENPLANE_DAEMON_HOME", "/env/path")
		result := ResolveDaemonHome("")
		if result != "/env/path" {
			t.Errorf("expected /env/path, got %s", result)
		}
	})

	t.Run("default fallback", func(t *testing.T) {
		t.Setenv("OPENPLANE_DAEMON_HOME", "")
		result := ResolveDaemonHome("")
		if result == "" {
			t.Fatal("expected non-empty default")
		}
	})
}

func TestResolveListen(t *testing.T) {
	t.Run("explicit wins", func(t *testing.T) {
		result := ResolveListen("0.0.0.0:9999")
		if result != "0.0.0.0:9999" {
			t.Errorf("expected 0.0.0.0:9999, got %s", result)
		}
	})

	t.Run("env fallback", func(t *testing.T) {
		t.Setenv("OPENPLANE_LISTEN", "0.0.0.0:7777")
		result := ResolveListen("")
		if result != "0.0.0.0:7777" {
			t.Errorf("expected 0.0.0.0:7777, got %s", result)
		}
	})

	t.Run("default", func(t *testing.T) {
		t.Setenv("OPENPLANE_LISTEN", "")
		result := ResolveListen("")
		if result != DefaultListen {
			t.Errorf("expected %s, got %s", DefaultListen, result)
		}
	})
}

func TestReadPidLock(t *testing.T) {
	t.Run("no file returns nil", func(t *testing.T) {
		dir := t.TempDir()
		info, err := ReadPidLock(dir)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if info != nil {
			t.Error("expected nil for missing pid file")
		}
	})

	t.Run("valid file", func(t *testing.T) {
		dir := t.TempDir()
		pidInfo := PidLockInfo{
			PID:       12345,
			StartedAt: "2024-01-01T00:00:00Z",
			Hostname:  "test-host",
			UID:       1000,
			SockPath:  "127.0.0.1:6868",
		}
		data, _ := json.Marshal(pidInfo)
		if err := os.WriteFile(filepath.Join(dir, PidFileName), data, 0o644); err != nil {
			t.Fatal(err)
		}

		info, err := ReadPidLock(dir)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if info == nil {
			t.Fatal("expected pid info")
		}
		if info.PID != 12345 {
			t.Errorf("expected PID 12345, got %d", info.PID)
		}
		if info.SockPath != "127.0.0.1:6868" {
			t.Errorf("expected sockPath 127.0.0.1:6868, got %s", info.SockPath)
		}
	})

	t.Run("invalid json", func(t *testing.T) {
		dir := t.TempDir()
		if err := os.WriteFile(filepath.Join(dir, PidFileName), []byte("not-json"), 0o644); err != nil {
			t.Fatal(err)
		}

		_, err := ReadPidLock(dir)
		if err == nil {
			t.Error("expected error for invalid json")
		}
	})
}

func TestIsPidRunning(t *testing.T) {
	t.Run("current process is running", func(t *testing.T) {
		if !IsPidRunning(os.Getpid()) {
			t.Error("expected current process to be running")
		}
	})

	t.Run("invalid pid returns false", func(t *testing.T) {
		if IsPidRunning(-1) {
			t.Error("expected -1 to not be running")
		}
		if IsPidRunning(0) {
			t.Error("expected 0 to not be running")
		}
	})
}

func TestCheckHealth(t *testing.T) {
	t.Run("healthy server", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/health" {
				w.WriteHeader(http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(HealthResponse{
				Status:   "ok",
				ServerID: "srv_test123",
				Version:  "0.1.0",
				Uptime:   42.5,
			})
		}))
		defer server.Close()

		addr := server.Listener.Addr().String()
		health, err := CheckHealth(context.Background(), addr)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if health.Status != "ok" {
			t.Errorf("expected status ok, got %s", health.Status)
		}
		if health.ServerID != "srv_test123" {
			t.Errorf("expected srv_test123, got %s", health.ServerID)
		}
		if health.Version != "0.1.0" {
			t.Errorf("expected 0.1.0, got %s", health.Version)
		}
	})

	t.Run("unhealthy server", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer server.Close()

		addr := server.Listener.Addr().String()
		_, err := CheckHealth(context.Background(), addr)
		if err == nil {
			t.Error("expected error for unhealthy server")
		}
	})

	t.Run("unreachable server", func(t *testing.T) {
		_, err := CheckHealth(context.Background(), "127.0.0.1:1")
		if err == nil {
			t.Error("expected error for unreachable server")
		}
	})
}

func TestFormatUptime(t *testing.T) {
	tests := []struct {
		seconds  float64
		expected string
	}{
		{0, "0s"},
		{30, "30s"},
		{90, "1m30s"},
		{3600, "1h0m"},
		{3661, "1h1m"},
		{86400, "1d0h"},
		{90000, "1d1h"},
	}

	for _, tc := range tests {
		t.Run(fmt.Sprintf("%.0fs", tc.seconds), func(t *testing.T) {
			result := FormatUptime(tc.seconds)
			if result != tc.expected {
				t.Errorf("FormatUptime(%.0f) = %s, want %s", tc.seconds, result, tc.expected)
			}
		})
	}
}

func TestFormatListenAddress(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"127.0.0.1:6868", "127.0.0.1:6868"},
		{"0.0.0.0:8080", "0.0.0.0:8080"},
		{"localhost:6868", "localhost:6868"},
		{"/tmp/openplane.sock", "/tmp/openplane.sock"},
		{"6868", "127.0.0.1:6868"},
	}

	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			result := FormatListenAddress(tc.input)
			if result != tc.expected {
				t.Errorf("FormatListenAddress(%q) = %q, want %q", tc.input, result, tc.expected)
			}
		})
	}
}

func TestGetState(t *testing.T) {
	t.Run("no pid file", func(t *testing.T) {
		dir := t.TempDir()
		state, err := GetState(context.Background(), dir)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if state.PidInfo != nil {
			t.Error("expected nil PidInfo")
		}
		if state.Running {
			t.Error("expected not running")
		}
	})

	t.Run("stale pid file", func(t *testing.T) {
		dir := t.TempDir()
		pidInfo := PidLockInfo{
			PID:       999999,
			StartedAt: "2024-01-01T00:00:00Z",
			Hostname:  "test",
			UID:       1000,
			SockPath:  "127.0.0.1:6868",
		}
		data, _ := json.Marshal(pidInfo)
		os.WriteFile(filepath.Join(dir, PidFileName), data, 0o644)

		state, err := GetState(context.Background(), dir)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if state.PidInfo == nil {
			t.Fatal("expected PidInfo")
		}
		if state.Running {
			t.Error("expected not running for stale PID")
		}
	})
}
