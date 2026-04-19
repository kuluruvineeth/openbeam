package update

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestCompareSemver(t *testing.T) {
	cases := []struct {
		a, b string
		want int
	}{
		{"0.1.0", "0.1.0", 0},
		{"0.2.0", "0.1.0", 1},
		{"0.1.0", "0.2.0", -1},
		{"1.0.0", "0.99.99", 1},
		{"1.0.0", "1.0.0-rc.1", 1},
		{"1.0.0-rc.1", "1.0.0", -1},
		{"1.0.0-rc.2", "1.0.0-rc.1", 1},
	}
	for _, c := range cases {
		got := compareSemver(c.a, c.b)
		if (got > 0) != (c.want > 0) || (got < 0) != (c.want < 0) || (got == 0) != (c.want == 0) {
			t.Errorf("compareSemver(%q, %q) = %d, want %d", c.a, c.b, got, c.want)
		}
	}
}

func TestIsNewer(t *testing.T) {
	cases := []struct {
		candidate, current string
		want               bool
	}{
		{"0.2.0", "0.1.0", true},
		{"0.1.0", "0.2.0", false},
		{"0.1.0", "0.1.0", false},
		{"cli-v0.2.0", "0.1.0", true},
		{"v0.2.0", "v0.1.0", true},
		{"", "0.1.0", false},
		{"0.2.0", "", false},
	}
	for _, c := range cases {
		if got := isNewer(c.candidate, c.current); got != c.want {
			t.Errorf("isNewer(%q, %q) = %v, want %v", c.candidate, c.current, got, c.want)
		}
	}
}

func TestShouldSkip(t *testing.T) {
	c := New("0.1.0")

	t.Run("env disabled", func(t *testing.T) {
		t.Setenv(disableEnvKey, "1")
		skip, _ := c.ShouldSkip(^uintptr(0), "search")
		if !skip {
			t.Error("expected skip when env disabled")
		}
	})

	t.Run("dev build", func(t *testing.T) {
		t.Setenv(disableEnvKey, "")
		dev := New("0.0.0")
		skip, reason := dev.ShouldSkip(^uintptr(0), "search")
		if !skip || !strings.Contains(reason, "dev build") {
			t.Errorf("expected dev build skip, got skip=%v reason=%q", skip, reason)
		}
	})

	t.Run("empty version", func(t *testing.T) {
		t.Setenv(disableEnvKey, "")
		empty := New("")
		skip, _ := empty.ShouldSkip(^uintptr(0), "search")
		if !skip {
			t.Error("expected skip for empty version")
		}
	})

	t.Run("non-interactive stderr", func(t *testing.T) {
		t.Setenv(disableEnvKey, "")
		skip, reason := c.ShouldSkip(^uintptr(0), "search")
		if !skip || !strings.Contains(reason, "non-interactive") {
			t.Errorf("expected non-interactive skip, got skip=%v reason=%q", skip, reason)
		}
	})

	t.Run("upgrade subcommand skipped", func(t *testing.T) {
		t.Setenv(disableEnvKey, "")
		for _, sub := range []string{"upgrade", "doctor", "version", "completion", "mcp"} {
			skip, _ := c.ShouldSkip(^uintptr(0), sub)
			if !skip {
				t.Errorf("expected skip for %q", sub)
			}
		}
	})
}

func TestCacheReadWrite(t *testing.T) {
	dir := t.TempDir()
	c := &Checker{CurrentVersion: "0.1.0", CacheDir: dir, Clock: time.Now}

	_, ok := c.readCache()
	if ok {
		t.Fatal("expected empty cache")
	}

	entry := cacheEntry{LatestVersion: "0.2.0", CheckedAt: time.Now().UTC().Truncate(time.Second)}
	if err := c.writeCache(entry); err != nil {
		t.Fatal(err)
	}

	got, ok := c.readCache()
	if !ok {
		t.Fatal("expected cache hit")
	}
	if got.LatestVersion != entry.LatestVersion {
		t.Errorf("version = %q, want %q", got.LatestVersion, entry.LatestVersion)
	}
}

func TestIsExpired(t *testing.T) {
	now := time.Date(2026, 4, 19, 12, 0, 0, 0, time.UTC)
	c := &Checker{Clock: func() time.Time { return now }}

	if c.isExpired(cacheEntry{CheckedAt: now.Add(-1 * time.Hour)}) {
		t.Error("1h old should not be expired")
	}
	if !c.isExpired(cacheEntry{CheckedAt: now.Add(-25 * time.Hour)}) {
		t.Error("25h old should be expired")
	}
}

func TestFetchLatest(t *testing.T) {
	payload := []map[string]any{
		{"tag_name": "cli-v0.3.0", "prerelease": false, "draft": false},
		{"tag_name": "cli-v0.2.0", "prerelease": false, "draft": false},
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(payload)
	}))
	defer server.Close()

	got, err := fetchLatest(context.Background(), server.Client(), server.URL)
	if err != nil {
		t.Fatal(err)
	}
	if got != "0.3.0" {
		t.Errorf("latest = %q, want 0.3.0", got)
	}
}

func TestFetchLatest_SkipsPrerelease(t *testing.T) {
	payload := []map[string]any{
		{"tag_name": "cli-v0.3.0-rc.1", "prerelease": true, "draft": false},
		{"tag_name": "cli-v0.2.0", "prerelease": false, "draft": false},
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(payload)
	}))
	defer server.Close()

	got, err := fetchLatest(context.Background(), server.Client(), server.URL)
	if err != nil {
		t.Fatal(err)
	}
	if got != "0.2.0" {
		t.Errorf("latest = %q, want 0.2.0", got)
	}
}

func TestNotice_NewerAvailable(t *testing.T) {
	dir := t.TempDir()
	c := &Checker{
		CurrentVersion: "0.1.0",
		CacheDir:       dir,
		Clock:          time.Now,
		ClientFactory:  func() *http.Client { return &http.Client{Timeout: time.Second} },
	}
	entry := cacheEntry{LatestVersion: "0.2.0", CheckedAt: time.Now()}
	if err := c.writeCache(entry); err != nil {
		t.Fatal(err)
	}

	got := c.Notice(context.Background())
	if !strings.Contains(got, "0.2.0 available") {
		t.Errorf("notice = %q", got)
	}
	if !strings.Contains(got, "openbeam upgrade") {
		t.Errorf("notice should suggest upgrade: %q", got)
	}
}

func TestNotice_UpToDate(t *testing.T) {
	dir := t.TempDir()
	c := &Checker{
		CurrentVersion: "0.1.0",
		CacheDir:       dir,
		Clock:          time.Now,
		ClientFactory:  func() *http.Client { return &http.Client{Timeout: time.Second} },
	}
	if err := c.writeCache(cacheEntry{LatestVersion: "0.1.0", CheckedAt: time.Now()}); err != nil {
		t.Fatal(err)
	}
	if got := c.Notice(context.Background()); got != "" {
		t.Errorf("expected empty notice when on latest, got %q", got)
	}
}

func TestNotice_ColdCache(t *testing.T) {
	c := &Checker{
		CurrentVersion: "0.1.0",
		CacheDir:       t.TempDir(),
		Clock:          time.Now,
		ClientFactory:  func() *http.Client { return &http.Client{Timeout: 100 * time.Millisecond} },
	}
	if got := c.Notice(context.Background()); got != "" {
		t.Errorf("cold cache should produce no notice, got %q", got)
	}
}

func TestWriteCache_Atomic(t *testing.T) {
	dir := t.TempDir()
	c := &Checker{CacheDir: dir}

	entries := []cacheEntry{
		{LatestVersion: "0.1.0", CheckedAt: time.Now()},
		{LatestVersion: "0.2.0", CheckedAt: time.Now()},
		{LatestVersion: "0.3.0", CheckedAt: time.Now()},
	}
	for _, e := range entries {
		if err := c.writeCache(e); err != nil {
			t.Fatalf("writeCache: %v", err)
		}
	}

	matches, err := filepath.Glob(filepath.Join(dir, ".update-*"))
	if err != nil || len(matches) > 0 {
		t.Errorf("expected no leftover tmp files, got %v", matches)
	}

	info, err := os.Stat(filepath.Join(dir, cacheFileName))
	if err != nil {
		t.Fatal(err)
	}
	if info.Size() == 0 {
		t.Error("cache file empty")
	}
}

