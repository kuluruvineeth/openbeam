package doctor

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
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/auth"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/config"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/version"
)

const (
	networkTimeout     = 5 * time.Second
	latestTimeout      = 4 * time.Second
	githubReleasesAPI  = "https://api.github.com/repos/kuluruvineeth/openplane/releases?per_page=10"
	releaseTagPrefix   = "cli-v"
	authProbeEndpoint  = "/api/mcp/tools"
	healthProbePath    = "/health"
)

type status string

const (
	statusPass status = "pass"
	statusWarn status = "warn"
	statusFail status = "fail"
	statusSkip status = "skip"
)

type result struct {
	Name   string `json:"name"`
	Status status `json:"status"`
	Detail string `json:"detail,omitempty"`
	Hint   string `json:"hint,omitempty"`
}

type report struct {
	Results []result `json:"results"`
	Summary summary  `json:"summary"`
}

type summary struct {
	Pass int `json:"pass"`
	Warn int `json:"warn"`
	Fail int `json:"fail"`
	Skip int `json:"skip"`
}

func NewCommand() *cobra.Command {
	var jsonOut bool
	var skipNetwork bool
	cmd := &cobra.Command{
		Use:   "doctor",
		Short: "Diagnose the CLI installation, auth, and connectivity",
		Long:  "Runs a series of checks against the CLI binary, config, auth store, and the configured server. Exits non-zero if any check fails.",
		RunE: func(cmd *cobra.Command, args []string) error {
			hostOverride, _ := cmd.Flags().GetString("host")
			return run(cmd, jsonOut, skipNetwork, strings.TrimSpace(hostOverride))
		},
	}
	cmd.Flags().BoolVar(&jsonOut, "json", false, "emit results as JSON")
	cmd.Flags().BoolVar(&skipNetwork, "offline", false, "skip network-dependent checks")
	return cmd
}

func run(cmd *cobra.Command, jsonOut, offline bool, hostOverride string) error {
	ctx := cmd.Context()
	results := runAllChecks(ctx, offline, hostOverride)

	rep := report{Results: results, Summary: summarize(results)}

	if jsonOut {
		return writeJSON(cmd.OutOrStdout(), rep)
	}
	writeText(cmd.OutOrStdout(), rep)

	if rep.Summary.Fail > 0 {
		return errs.New(errs.KindUnknown, fmt.Sprintf("%d check(s) failed", rep.Summary.Fail), nil)
	}
	return nil
}

func runAllChecks(ctx context.Context, offline bool, hostOverride string) []result {
	results := make([]result, 0, 16)
	results = append(results, buildCheck())

	if offline {
		results = append(results, result{Name: "latest version", Status: statusSkip, Detail: "--offline"})
	} else {
		results = append(results, latestVersionCheck(ctx))
	}

	configStore, configResult := configFileCheck()
	results = append(results, configResult)

	profile, profileName, profileResult := profileCheck(configStore)
	results = append(results, profileResult)

	apiKey, apiKeyResult := apiKeyCheck(profile)
	results = append(results, apiKeyResult)

	host := resolveHost(profile, hostOverride)
	if offline {
		results = append(results, result{Name: "auth probe", Status: statusSkip, Detail: "--offline"})
		results = append(results, result{Name: "host reachable", Status: statusSkip, Detail: "--offline"})
	} else if host == "" {
		results = append(results, result{Name: "host reachable", Status: statusSkip, Detail: "no host configured"})
		results = append(results, result{Name: "auth probe", Status: statusSkip, Detail: "no host configured"})
	} else {
		results = append(results, hostReachableCheck(ctx, host))
		results = append(results, authProbeCheck(ctx, host, apiKey, profileName))
	}

	results = append(results, binaryPathCheck())
	results = append(results, shellCompletionCheck())

	return results
}

func buildCheck() result {
	detail := fmt.Sprintf("openbeam %s (commit=%s date=%s go=%s %s/%s)",
		version.Version, version.Commit, version.Date,
		runtime.Version(), runtime.GOOS, runtime.GOARCH,
	)
	return result{Name: "build", Status: statusPass, Detail: detail}
}

func latestVersionCheck(ctx context.Context) result {
	ctx, cancel := context.WithTimeout(ctx, latestTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, githubReleasesAPI, nil)
	if err != nil {
		return result{Name: "latest version", Status: statusWarn, Detail: err.Error()}
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "openbeam-cli-doctor")

	client := &http.Client{Timeout: latestTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return result{Name: "latest version", Status: statusWarn, Detail: "could not reach GitHub", Hint: "check internet connection"}
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusTooManyRequests {
		return result{Name: "latest version", Status: statusWarn, Detail: "GitHub API rate limit"}
	}
	if resp.StatusCode != http.StatusOK {
		return result{Name: "latest version", Status: statusWarn, Detail: fmt.Sprintf("GitHub returned %d", resp.StatusCode)}
	}

	var releases []struct {
		TagName    string `json:"tag_name"`
		Prerelease bool   `json:"prerelease"`
		Draft      bool   `json:"draft"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&releases); err != nil {
		return result{Name: "latest version", Status: statusWarn, Detail: "invalid GitHub response"}
	}

	var latest string
	for _, r := range releases {
		if r.Draft || r.Prerelease {
			continue
		}
		if strings.HasPrefix(r.TagName, releaseTagPrefix) {
			latest = strings.TrimPrefix(r.TagName, releaseTagPrefix)
			break
		}
	}
	if latest == "" {
		return result{Name: "latest version", Status: statusSkip, Detail: "no CLI releases published"}
	}
	current := strings.TrimPrefix(strings.TrimPrefix(version.Version, "v"), releaseTagPrefix)
	if current == latest {
		return result{Name: "latest version", Status: statusPass, Detail: "on latest (" + latest + ")"}
	}
	return result{
		Name:   "latest version",
		Status: statusWarn,
		Detail: fmt.Sprintf("%s available (current: %s)", latest, current),
		Hint:   "run: openbeam upgrade",
	}
}

func configFileCheck() (*config.Store, result) {
	path, err := config.DefaultPath()
	if err != nil {
		return nil, result{Name: "config file", Status: statusFail, Detail: err.Error()}
	}
	store, err := config.NewStore(path)
	if err != nil {
		return nil, result{Name: "config file", Status: statusFail, Detail: err.Error()}
	}
	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return store, result{
				Name:   "config file",
				Status: statusWarn,
				Detail: path + " does not exist",
				Hint:   "run: openbeam auth login (creates a default profile)",
			}
		}
		return store, result{Name: "config file", Status: statusFail, Detail: err.Error()}
	}
	mode := info.Mode().Perm()
	if mode&0o077 != 0 {
		return store, result{
			Name:   "config file",
			Status: statusWarn,
			Detail: fmt.Sprintf("%s has permissions %#o (expected 0600)", path, mode),
			Hint:   "chmod 600 " + path,
		}
	}
	return store, result{Name: "config file", Status: statusPass, Detail: path}
}

func profileCheck(store *config.Store) (config.Profile, string, result) {
	var empty config.Profile
	if store == nil {
		return empty, "", result{Name: "profile", Status: statusSkip, Detail: "config unavailable"}
	}
	_, profile, name, err := store.Resolve("")
	if err != nil {
		return empty, "", result{
			Name:   "profile",
			Status: statusFail,
			Detail: err.Error(),
			Hint:   "run: openbeam auth login",
		}
	}
	host := resolveHostFromProfile(profile)
	if host == "" {
		return profile, name, result{
			Name:   "profile",
			Status: statusWarn,
			Detail: fmt.Sprintf("profile %q has no host", name),
			Hint:   "run: openbeam config set host https://...",
		}
	}
	return profile, name, result{
		Name:   "profile",
		Status: statusPass,
		Detail: fmt.Sprintf("%s (host=%s)", name, host),
	}
}

func apiKeyCheck(profile config.Profile) (string, result) {
	if fromEnv := strings.TrimSpace(os.Getenv("OPENBEAM_API_KEY")); fromEnv != "" {
		return fromEnv, result{Name: "api key", Status: statusPass, Detail: "from OPENBEAM_API_KEY"}
	}
	if profile.APIKeyRef == "" {
		return "", result{
			Name:   "api key",
			Status: statusWarn,
			Detail: "no API key configured",
			Hint:   "run: openbeam auth login (or set OPENBEAM_API_KEY)",
		}
	}
	store, err := auth.NewDefaultStore()
	if err != nil {
		return "", result{Name: "api key", Status: statusFail, Detail: err.Error()}
	}
	value, err := store.Get(profile.APIKeyRef)
	if err == auth.ErrSecretNotFound || value == "" {
		return "", result{
			Name:   "api key",
			Status: statusFail,
			Detail: fmt.Sprintf("profile references %q but store is empty", profile.APIKeyRef),
			Hint:   "run: openbeam auth login",
		}
	}
	if err != nil {
		return "", result{Name: "api key", Status: statusFail, Detail: err.Error()}
	}
	return value, result{Name: "api key", Status: statusPass, Detail: "from secret store (" + profile.APIKeyRef + ")"}
}

func hostReachableCheck(ctx context.Context, host string) result {
	ctx, cancel := context.WithTimeout(ctx, networkTimeout)
	defer cancel()

	url := strings.TrimRight(host, "/") + healthProbePath
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return result{Name: "host reachable", Status: statusFail, Detail: err.Error()}
	}
	req.Header.Set("User-Agent", "openbeam-cli-doctor")

	start := time.Now()
	client := &http.Client{Timeout: networkTimeout}
	resp, err := client.Do(req)
	elapsed := time.Since(start).Round(time.Millisecond)
	if err != nil {
		return result{
			Name:   "host reachable",
			Status: statusFail,
			Detail: fmt.Sprintf("%s unreachable: %s", host, err.Error()),
			Hint:   "check --host or OPENBEAM_HOST",
		}
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 500 {
		return result{
			Name:   "host reachable",
			Status: statusFail,
			Detail: fmt.Sprintf("%s returned %d after %s", url, resp.StatusCode, elapsed),
		}
	}
	return result{
		Name:   "host reachable",
		Status: statusPass,
		Detail: fmt.Sprintf("%s → %d in %s", url, resp.StatusCode, elapsed),
	}
}

func authProbeCheck(ctx context.Context, host, apiKey, profileName string) result {
	if apiKey == "" {
		return result{Name: "auth probe", Status: statusSkip, Detail: "no API key"}
	}
	ctx, cancel := context.WithTimeout(ctx, networkTimeout)
	defer cancel()

	url := strings.TrimRight(host, "/") + authProbeEndpoint
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return result{Name: "auth probe", Status: statusFail, Detail: err.Error()}
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "openbeam-cli-doctor")

	client := &http.Client{Timeout: networkTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return result{Name: "auth probe", Status: statusFail, Detail: err.Error()}
	}
	defer resp.Body.Close()

	switch {
	case resp.StatusCode == http.StatusOK:
		return result{Name: "auth probe", Status: statusPass, Detail: fmt.Sprintf("%s → 200 (profile=%s)", authProbeEndpoint, profileName)}
	case resp.StatusCode == http.StatusUnauthorized:
		return result{
			Name:   "auth probe",
			Status: statusFail,
			Detail: "API key rejected (401)",
			Hint:   "run: openbeam auth login",
		}
	case resp.StatusCode == http.StatusForbidden:
		return result{
			Name:   "auth probe",
			Status: statusFail,
			Detail: "API key forbidden (403)",
			Hint:   "check team membership and API key scopes",
		}
	default:
		return result{Name: "auth probe", Status: statusWarn, Detail: fmt.Sprintf("%d from %s", resp.StatusCode, authProbeEndpoint)}
	}
}

func binaryPathCheck() result {
	self, err := os.Executable()
	if err != nil {
		return result{Name: "binary on PATH", Status: statusFail, Detail: err.Error()}
	}
	resolvedSelf, err := filepath.EvalSymlinks(self)
	if err != nil {
		resolvedSelf = self
	}
	onPath, err := exec.LookPath("openbeam")
	if err != nil {
		return result{
			Name:   "binary on PATH",
			Status: statusWarn,
			Detail: fmt.Sprintf("running as %s but 'openbeam' not resolvable on PATH", resolvedSelf),
			Hint:   "add " + filepath.Dir(resolvedSelf) + " to PATH",
		}
	}
	resolvedOnPath, err := filepath.EvalSymlinks(onPath)
	if err != nil {
		resolvedOnPath = onPath
	}
	if resolvedOnPath != resolvedSelf {
		return result{
			Name:   "binary on PATH",
			Status: statusWarn,
			Detail: fmt.Sprintf("running %s but PATH resolves to %s", resolvedSelf, resolvedOnPath),
			Hint:   "the first openbeam on PATH will be used by 'brew'/'scoop'/scripts",
		}
	}
	return result{Name: "binary on PATH", Status: statusPass, Detail: resolvedSelf}
}

func shellCompletionCheck() result {
	shell := detectShell()
	if shell == "" {
		return result{Name: "shell completion", Status: statusSkip, Detail: "unknown shell"}
	}
	candidates := completionCandidates(shell)
	if len(candidates) == 0 {
		return result{Name: "shell completion", Status: statusSkip, Detail: "no candidates for " + shell}
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return result{Name: "shell completion", Status: statusPass, Detail: c}
		}
	}
	return result{
		Name:   "shell completion",
		Status: statusWarn,
		Detail: shell + " completions not installed",
		Hint:   completionHint(shell),
	}
}

func detectShell() string {
	sh := strings.TrimSpace(os.Getenv("SHELL"))
	if sh == "" {
		return ""
	}
	return filepath.Base(sh)
}

func completionCandidates(shell string) []string {
	home, _ := os.UserHomeDir()
	switch shell {
	case "bash":
		return []string{
			"/etc/bash_completion.d/openbeam",
			"/usr/local/etc/bash_completion.d/openbeam",
			"/opt/homebrew/etc/bash_completion.d/openbeam",
			filepath.Join(home, ".bash_completion.d", "openbeam"),
			filepath.Join(home, ".local/share/bash-completion/completions/openbeam"),
		}
	case "zsh":
		return []string{
			"/usr/local/share/zsh/site-functions/_openbeam",
			"/opt/homebrew/share/zsh/site-functions/_openbeam",
			"/usr/share/zsh/site-functions/_openbeam",
			filepath.Join(home, ".zsh", "completions", "_openbeam"),
			filepath.Join(home, ".oh-my-zsh/completions/_openbeam"),
		}
	case "fish":
		return []string{
			filepath.Join(home, ".config/fish/completions/openbeam.fish"),
			"/usr/share/fish/vendor_completions.d/openbeam.fish",
			"/opt/homebrew/share/fish/vendor_completions.d/openbeam.fish",
		}
	default:
		return nil
	}
}

func completionHint(shell string) string {
	return "openbeam completion install"
}

func resolveHost(profile config.Profile, hostOverride string) string {
	if hostOverride != "" {
		return hostOverride
	}
	if env := strings.TrimSpace(os.Getenv("OPENBEAM_HOST")); env != "" {
		return env
	}
	return resolveHostFromProfile(profile)
}

func resolveHostFromProfile(profile config.Profile) string {
	return strings.TrimSpace(profile.Host)
}

func writeJSON(w io.Writer, rep report) error {
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	return enc.Encode(rep)
}

func writeText(w io.Writer, rep report) {
	for _, r := range rep.Results {
		symbol := symbolFor(r.Status)
		fmt.Fprintf(w, "%s %-20s %s\n", symbol, r.Name, r.Detail)
		if r.Hint != "" {
			fmt.Fprintf(w, "  %s\n", r.Hint)
		}
	}
	fmt.Fprintf(w, "\n%d passed, %d warned, %d failed, %d skipped\n",
		rep.Summary.Pass, rep.Summary.Warn, rep.Summary.Fail, rep.Summary.Skip)
}

func symbolFor(s status) string {
	switch s {
	case statusPass:
		return "[pass]"
	case statusWarn:
		return "[warn]"
	case statusFail:
		return "[fail]"
	case statusSkip:
		return "[skip]"
	default:
		return "[    ]"
	}
}

func summarize(results []result) summary {
	var s summary
	for _, r := range results {
		switch r.Status {
		case statusPass:
			s.Pass++
		case statusWarn:
			s.Warn++
		case statusFail:
			s.Fail++
		case statusSkip:
			s.Skip++
		}
	}
	return s
}
