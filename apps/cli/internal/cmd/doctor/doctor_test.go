package doctor

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/config"
)

func TestSummarize(t *testing.T) {
	results := []result{
		{Status: statusPass}, {Status: statusPass},
		{Status: statusWarn},
		{Status: statusFail},
		{Status: statusSkip}, {Status: statusSkip}, {Status: statusSkip},
	}
	got := summarize(results)
	want := summary{Pass: 2, Warn: 1, Fail: 1, Skip: 3}
	if got != want {
		t.Errorf("summarize = %+v, want %+v", got, want)
	}
}

func TestSymbolFor(t *testing.T) {
	cases := map[status]string{
		statusPass: "[pass]",
		statusWarn: "[warn]",
		statusFail: "[fail]",
		statusSkip: "[skip]",
	}
	for s, want := range cases {
		if got := symbolFor(s); got != want {
			t.Errorf("symbolFor(%q) = %q, want %q", s, got, want)
		}
	}
}

func TestResolveHost_Override(t *testing.T) {
	profile := config.Profile{Host: "http://from-profile"}
	t.Setenv("OPENBEAM_HOST", "http://from-env")

	if got := resolveHost(profile, "http://from-flag"); got != "http://from-flag" {
		t.Errorf("flag override lost: got %q", got)
	}
}

func TestResolveHost_Env(t *testing.T) {
	profile := config.Profile{Host: "http://from-profile"}
	t.Setenv("OPENBEAM_HOST", "http://from-env")

	if got := resolveHost(profile, ""); got != "http://from-env" {
		t.Errorf("env override lost: got %q", got)
	}
}

func TestResolveHost_Profile(t *testing.T) {
	profile := config.Profile{Host: "http://from-profile"}
	t.Setenv("OPENBEAM_HOST", "")

	if got := resolveHost(profile, ""); got != "http://from-profile" {
		t.Errorf("profile host lost: got %q", got)
	}
}

func TestApiKeyCheck_Env(t *testing.T) {
	t.Setenv("OPENBEAM_API_KEY", "op_live_test")

	key, r := apiKeyCheck(config.Profile{APIKeyRef: "ignored"})
	if key != "op_live_test" {
		t.Errorf("key = %q, want op_live_test", key)
	}
	if r.Status != statusPass {
		t.Errorf("status = %s, want pass", r.Status)
	}
	if !strings.Contains(r.Detail, "OPENBEAM_API_KEY") {
		t.Errorf("detail should mention env var, got %q", r.Detail)
	}
}

func TestApiKeyCheck_NoRef(t *testing.T) {
	t.Setenv("OPENBEAM_API_KEY", "")

	key, r := apiKeyCheck(config.Profile{APIKeyRef: ""})
	if key != "" {
		t.Errorf("expected empty key, got %q", key)
	}
	if r.Status != statusWarn {
		t.Errorf("status = %s, want warn", r.Status)
	}
	if r.Hint == "" {
		t.Error("expected hint for missing key")
	}
}

func TestHostReachableCheck_200(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != healthProbePath {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	r := hostReachableCheck(context.Background(), server.URL)
	if r.Status != statusPass {
		t.Errorf("status = %s, want pass: %s", r.Status, r.Detail)
	}
	if !strings.Contains(r.Detail, "200") {
		t.Errorf("detail should mention 200: %q", r.Detail)
	}
}

func TestHostReachableCheck_Unreachable(t *testing.T) {
	r := hostReachableCheck(context.Background(), "http://127.0.0.1:1")
	if r.Status != statusFail {
		t.Errorf("status = %s, want fail", r.Status)
	}
	if r.Hint == "" {
		t.Error("expected hint for unreachable host")
	}
}

func TestAuthProbeCheck_200(t *testing.T) {
	var seenAuth string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seenAuth = r.Header.Get("Authorization")
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	r := authProbeCheck(context.Background(), server.URL, "op_live_abc", "default")
	if r.Status != statusPass {
		t.Errorf("status = %s, want pass: %s", r.Status, r.Detail)
	}
	if seenAuth != "Bearer op_live_abc" {
		t.Errorf("authorization header = %q", seenAuth)
	}
}

func TestAuthProbeCheck_401(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	r := authProbeCheck(context.Background(), server.URL, "op_live_bad", "default")
	if r.Status != statusFail {
		t.Errorf("status = %s, want fail", r.Status)
	}
	if !strings.Contains(r.Hint, "auth login") {
		t.Errorf("hint should suggest login, got %q", r.Hint)
	}
}

func TestAuthProbeCheck_NoKey(t *testing.T) {
	r := authProbeCheck(context.Background(), "http://example.com", "", "default")
	if r.Status != statusSkip {
		t.Errorf("status = %s, want skip", r.Status)
	}
}

func TestCompletionHint(t *testing.T) {
	cases := map[string]string{
		"bash": "bash-completion",
		"zsh":  "fpath[1]",
		"fish": "fish/completions",
	}
	for shell, expectSubstring := range cases {
		got := completionHint(shell)
		if !strings.Contains(got, expectSubstring) {
			t.Errorf("hint for %s = %q, missing %q", shell, got, expectSubstring)
		}
	}
}

func TestWriteJSON(t *testing.T) {
	rep := report{
		Results: []result{{Name: "build", Status: statusPass, Detail: "v0.1.0"}},
		Summary: summary{Pass: 1},
	}
	var buf bytes.Buffer
	if err := writeJSON(&buf, rep); err != nil {
		t.Fatal(err)
	}

	var decoded report
	if err := json.NewDecoder(&buf).Decode(&decoded); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(decoded.Results) != 1 || decoded.Results[0].Name != "build" {
		t.Errorf("roundtrip mismatch: %+v", decoded)
	}
	if decoded.Summary.Pass != 1 {
		t.Errorf("summary pass = %d", decoded.Summary.Pass)
	}
}

func TestWriteText(t *testing.T) {
	rep := report{
		Results: []result{
			{Name: "build", Status: statusPass, Detail: "ok"},
			{Name: "auth", Status: statusWarn, Detail: "missing", Hint: "login"},
			{Name: "host", Status: statusFail, Detail: "unreachable"},
		},
		Summary: summary{Pass: 1, Warn: 1, Fail: 1},
	}
	var buf bytes.Buffer
	writeText(&buf, rep)
	out := buf.String()

	for _, substr := range []string{"[pass]", "[warn]", "[fail]", "login", "1 passed", "1 failed"} {
		if !strings.Contains(out, substr) {
			t.Errorf("output missing %q:\n%s", substr, out)
		}
	}
}
