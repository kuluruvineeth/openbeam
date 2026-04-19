package update

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/term"
)

const (
	cacheDirName    = "openbeam"
	cacheFileName   = "update.json"
	cacheTTL        = 24 * time.Hour
	fetchTimeout    = 3 * time.Second
	releasesAPI     = "https://api.github.com/repos/kuluruvineeth/openbeam/releases?per_page=10"
	tagPrefix       = "cli-v"
	disableEnvKey   = "OPENBEAM_NO_UPDATE_CHECK"
	userAgent       = "openbeam-cli-update-check"
)

type cacheEntry struct {
	LatestVersion string    `json:"latest_version"`
	CheckedAt     time.Time `json:"checked_at"`
}

type Checker struct {
	CurrentVersion string
	ClientFactory  func() *http.Client
	Clock          func() time.Time
	CacheDir       string
	ReleasesURL    string
}

func New(currentVersion string) *Checker {
	return &Checker{
		CurrentVersion: currentVersion,
		ClientFactory:  func() *http.Client { return &http.Client{Timeout: fetchTimeout} },
		Clock:          time.Now,
	}
}

func (c *Checker) ShouldSkip(stderrFD uintptr, subcommand string) (bool, string) {
	if strings.TrimSpace(os.Getenv(disableEnvKey)) != "" {
		return true, "env disabled"
	}
	if v := strings.TrimSpace(c.CurrentVersion); v == "" || v == "0.0.0" || strings.Contains(v, "dev") {
		return true, "dev build"
	}
	if !isInteractive(stderrFD) {
		return true, "non-interactive stderr"
	}
	switch subcommand {
	case "upgrade", "doctor", "version", "completion", "mcp":
		return true, "skip for " + subcommand
	}
	return false, ""
}

func (c *Checker) Notice(ctx context.Context) string {
	entry, ok := c.readCache()
	if !ok || c.isExpired(entry) {
		go c.refresh(context.Background())
		if !ok {
			return ""
		}
	}
	if entry.LatestVersion == "" {
		return ""
	}
	if isNewer(entry.LatestVersion, c.CurrentVersion) {
		return fmt.Sprintf("\x1b[33m⚠\x1b[0m openbeam %s available (current: %s) — run: openbeam upgrade",
			entry.LatestVersion, c.CurrentVersion)
	}
	return ""
}

func (c *Checker) refresh(ctx context.Context) {
	ctx, cancel := context.WithTimeout(ctx, fetchTimeout)
	defer cancel()
	latest, err := fetchLatest(ctx, c.ClientFactory(), c.releasesURL())
	if err != nil {
		return
	}
	_ = c.writeCache(cacheEntry{LatestVersion: latest, CheckedAt: c.clock()})
}

func (c *Checker) releasesURL() string {
	if c.ReleasesURL != "" {
		return c.ReleasesURL
	}
	return releasesAPI
}

func (c *Checker) clock() time.Time {
	if c.Clock == nil {
		return time.Now()
	}
	return c.Clock()
}

func (c *Checker) isExpired(entry cacheEntry) bool {
	return c.clock().Sub(entry.CheckedAt) > cacheTTL
}

func (c *Checker) cachePath() (string, error) {
	if c.CacheDir != "" {
		return filepath.Join(c.CacheDir, cacheFileName), nil
	}
	base, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, cacheDirName, cacheFileName), nil
}

func (c *Checker) readCache() (cacheEntry, bool) {
	path, err := c.cachePath()
	if err != nil {
		return cacheEntry{}, false
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return cacheEntry{}, false
	}
	var entry cacheEntry
	if err := json.Unmarshal(data, &entry); err != nil {
		return cacheEntry{}, false
	}
	return entry, true
}

func (c *Checker) writeCache(entry cacheEntry) error {
	path, err := c.cachePath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	data, err := json.Marshal(entry)
	if err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), ".update-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		os.Remove(tmpName)
		return err
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpName)
		return err
	}
	return os.Rename(tmpName, path)
}

func fetchLatest(ctx context.Context, client *http.Client, url string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", userAgent)

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		io.Copy(io.Discard, resp.Body)
		return "", fmt.Errorf("status %d", resp.StatusCode)
	}
	var releases []struct {
		TagName    string `json:"tag_name"`
		Prerelease bool   `json:"prerelease"`
		Draft      bool   `json:"draft"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&releases); err != nil {
		return "", err
	}
	for _, r := range releases {
		if r.Draft || r.Prerelease {
			continue
		}
		if strings.HasPrefix(r.TagName, tagPrefix) {
			return strings.TrimPrefix(r.TagName, tagPrefix), nil
		}
	}
	return "", nil
}

func isInteractive(fd uintptr) bool {
	if fd == ^uintptr(0) {
		return false
	}
	return term.IsTerminal(int(fd))
}

func isNewer(candidate, current string) bool {
	if candidate == "" || current == "" {
		return false
	}
	current = strings.TrimPrefix(current, "v")
	current = strings.TrimPrefix(current, tagPrefix)
	candidate = strings.TrimPrefix(candidate, "v")
	candidate = strings.TrimPrefix(candidate, tagPrefix)
	return compareSemver(candidate, current) > 0
}

func compareSemver(a, b string) int {
	aMain, aPre := splitSemver(a)
	bMain, bPre := splitSemver(b)
	if c := compareNumeric(aMain, bMain); c != 0 {
		return c
	}
	return comparePrerelease(aPre, bPre)
}

func splitSemver(v string) (string, string) {
	if idx := strings.Index(v, "-"); idx >= 0 {
		return v[:idx], v[idx+1:]
	}
	return v, ""
}

func compareNumeric(a, b string) int {
	aParts := strings.Split(a, ".")
	bParts := strings.Split(b, ".")
	n := len(aParts)
	if len(bParts) > n {
		n = len(bParts)
	}
	for i := 0; i < n; i++ {
		ai := partAt(aParts, i)
		bi := partAt(bParts, i)
		if ai < bi {
			return -1
		}
		if ai > bi {
			return 1
		}
	}
	return 0
}

func partAt(parts []string, i int) int {
	if i >= len(parts) {
		return 0
	}
	n := 0
	for _, c := range parts[i] {
		if c < '0' || c > '9' {
			return 0
		}
		n = n*10 + int(c-'0')
	}
	return n
}

func comparePrerelease(a, b string) int {
	if a == "" && b == "" {
		return 0
	}
	if a == "" {
		return 1
	}
	if b == "" {
		return -1
	}
	if a < b {
		return -1
	}
	if a > b {
		return 1
	}
	return 0
}
