package config

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestDefaultPath(t *testing.T) {
	p, err := DefaultPath()
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Base(p) != "config.yaml" {
		t.Fatalf("DefaultPath() = %q, want filename config.yaml", p)
	}
	if !filepath.IsAbs(p) {
		t.Fatalf("DefaultPath() = %q, want absolute path", p)
	}
}

func TestNewStore(t *testing.T) {
	t.Run("explicit_path", func(t *testing.T) {
		s, err := NewStore("/tmp/test.yaml")
		if err != nil {
			t.Fatal(err)
		}
		if s.Path() != "/tmp/test.yaml" {
			t.Fatalf("Path() = %q, want /tmp/test.yaml", s.Path())
		}
	})

	t.Run("empty_path_uses_default", func(t *testing.T) {
		s, err := NewStore("")
		if err != nil {
			t.Fatal(err)
		}
		want, _ := DefaultPath()
		if s.Path() != want {
			t.Fatalf("Path() = %q, want %q", s.Path(), want)
		}
	})
}

func TestLoadMissingFile(t *testing.T) {
	dir := t.TempDir()
	store, err := NewStore(filepath.Join(dir, "nonexistent", "config.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	cfg, err := store.Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.CurrentProfile != "default" {
		t.Fatalf("CurrentProfile = %q, want %q", cfg.CurrentProfile, "default")
	}
	profile, ok := cfg.Profiles["default"]
	if !ok {
		t.Fatal("default profile missing")
	}
	if profile.Name != "default" {
		t.Fatalf("Name = %q, want %q", profile.Name, "default")
	}
	if profile.Host != "http://localhost:3000" {
		t.Fatalf("Host = %q, want %q", profile.Host, "http://localhost:3000")
	}
	if profile.Color != "auto" {
		t.Fatalf("Color = %q, want %q", profile.Color, "auto")
	}
	if profile.Timeout != 30*time.Second {
		t.Fatalf("Timeout = %v, want %v", profile.Timeout, 30*time.Second)
	}
}

func TestLoadValidYAML(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	content := []byte(`current_profile: staging
profiles:
  staging:
    host: https://staging.example.com
    team: team-abc
    timeout: 60s
`)
	if err := os.WriteFile(path, content, 0o600); err != nil {
		t.Fatal(err)
	}
	store, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	cfg, err := store.Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.CurrentProfile != "staging" {
		t.Fatalf("CurrentProfile = %q, want %q", cfg.CurrentProfile, "staging")
	}
	profile := cfg.Profiles["staging"]
	if profile.Host != "https://staging.example.com" {
		t.Fatalf("Host = %q, want %q", profile.Host, "https://staging.example.com")
	}
	if profile.Team != "team-abc" {
		t.Fatalf("Team = %q, want %q", profile.Team, "team-abc")
	}
	if profile.Timeout != 60*time.Second {
		t.Fatalf("Timeout = %v, want %v", profile.Timeout, 60*time.Second)
	}
	if profile.Name != "staging" {
		t.Fatalf("Name = %q, want %q (should be backfilled from map key)", profile.Name, "staging")
	}
	if profile.Color != "auto" {
		t.Fatalf("Color = %q, want %q (should be defaulted)", profile.Color, "auto")
	}
}

func TestLoadCorruptYAML(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	if err := os.WriteFile(path, []byte("{{invalid yaml"), 0o600); err != nil {
		t.Fatal(err)
	}
	store, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	_, err = store.Load()
	if err == nil {
		t.Fatal("expected error for corrupt YAML")
	}
}

func TestLoadEmptyProfiles(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	content := []byte(`current_profile: ""
profiles: {}
`)
	if err := os.WriteFile(path, content, 0o600); err != nil {
		t.Fatal(err)
	}
	store, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	cfg, err := store.Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.CurrentProfile != "default" {
		t.Fatalf("CurrentProfile = %q, want %q (should fallback to default)", cfg.CurrentProfile, "default")
	}
	if _, ok := cfg.Profiles["default"]; !ok {
		t.Fatal("default profile should be created for empty profiles map")
	}
}

func TestLoadNormalizesDefaults(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	content := []byte(`current_profile: prod
profiles:
  prod:
    team: team-xyz
`)
	if err := os.WriteFile(path, content, 0o600); err != nil {
		t.Fatal(err)
	}
	store, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	cfg, err := store.Load()
	if err != nil {
		t.Fatal(err)
	}
	profile := cfg.Profiles["prod"]
	if profile.Host != "http://localhost:3000" {
		t.Fatalf("Host = %q, want default", profile.Host)
	}
	if profile.Color != "auto" {
		t.Fatalf("Color = %q, want default", profile.Color)
	}
	if profile.Timeout != 30*time.Second {
		t.Fatalf("Timeout = %v, want default", profile.Timeout)
	}
	if profile.Name != "prod" {
		t.Fatalf("Name = %q, want %q", profile.Name, "prod")
	}
}

func TestSaveCreatesDirectories(t *testing.T) {
	dir := t.TempDir()
	nested := filepath.Join(dir, "deep", "nested", "config.yaml")
	store, err := NewStore(nested)
	if err != nil {
		t.Fatal(err)
	}
	cfg := File{
		CurrentProfile: "test",
		Profiles: map[string]Profile{
			"test": {Name: "test", Host: "https://example.com"},
		},
	}
	if err := store.Save(cfg); err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(nested)
	if err != nil {
		t.Fatalf("file not created: %v", err)
	}
	if info.Mode().Perm() != 0o600 {
		t.Fatalf("permissions = %o, want 0600", info.Mode().Perm())
	}
}

func TestSaveEmptyProfilesFallsBackToDefault(t *testing.T) {
	dir := t.TempDir()
	store, err := NewStore(filepath.Join(dir, "config.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	if err := store.Save(File{}); err != nil {
		t.Fatal(err)
	}
	cfg, err := store.Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.CurrentProfile != "default" {
		t.Fatalf("CurrentProfile = %q, want %q", cfg.CurrentProfile, "default")
	}
	if _, ok := cfg.Profiles["default"]; !ok {
		t.Fatal("default profile should exist after saving empty file")
	}
}

func TestSaveAndLoadRoundTrip(t *testing.T) {
	dir := t.TempDir()
	store, err := NewStore(filepath.Join(dir, "config.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	original := File{
		CurrentProfile: "production",
		Profiles: map[string]Profile{
			"production": {
				Name:    "production",
				Host:    "https://prod.example.com",
				Team:    "team-prod",
				Output:  "json",
				Color:   "always",
				Timeout: 45 * time.Second,
			},
			"staging": {
				Name:    "staging",
				Host:    "https://staging.example.com",
				Team:    "team-staging",
				Color:   "never",
				Timeout: 10 * time.Second,
			},
		},
	}
	if err := store.Save(original); err != nil {
		t.Fatal(err)
	}
	loaded, err := store.Load()
	if err != nil {
		t.Fatal(err)
	}
	if loaded.CurrentProfile != original.CurrentProfile {
		t.Fatalf("CurrentProfile = %q, want %q", loaded.CurrentProfile, original.CurrentProfile)
	}
	if len(loaded.Profiles) != len(original.Profiles) {
		t.Fatalf("len(Profiles) = %d, want %d", len(loaded.Profiles), len(original.Profiles))
	}
	for name, want := range original.Profiles {
		got, ok := loaded.Profiles[name]
		if !ok {
			t.Fatalf("profile %q missing after round-trip", name)
		}
		if got.Host != want.Host {
			t.Fatalf("[%s] Host = %q, want %q", name, got.Host, want.Host)
		}
		if got.Team != want.Team {
			t.Fatalf("[%s] Team = %q, want %q", name, got.Team, want.Team)
		}
		if got.Color != want.Color {
			t.Fatalf("[%s] Color = %q, want %q", name, got.Color, want.Color)
		}
		if got.Timeout != want.Timeout {
			t.Fatalf("[%s] Timeout = %v, want %v", name, got.Timeout, want.Timeout)
		}
	}
}

func TestResolveDefaultProfile(t *testing.T) {
	dir := t.TempDir()
	store, err := NewStore(filepath.Join(dir, "config.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	_, profile, name, err := store.Resolve("")
	if err != nil {
		t.Fatal(err)
	}
	if name != "default" {
		t.Fatalf("name = %q, want %q", name, "default")
	}
	if profile.Host != "http://localhost:3000" {
		t.Fatalf("Host = %q, want default host", profile.Host)
	}
	if profile.Name != "default" {
		t.Fatalf("profile.Name = %q, want %q", profile.Name, "default")
	}
}

func TestResolveNamedProfile(t *testing.T) {
	dir := t.TempDir()
	store, err := NewStore(filepath.Join(dir, "config.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	cfg := File{
		CurrentProfile: "default",
		Profiles: map[string]Profile{
			"default": {Name: "default", Host: "http://localhost:3000"},
			"prod":    {Host: "https://prod.example.com", Team: "team-prod"},
		},
	}
	if err := store.Save(cfg); err != nil {
		t.Fatal(err)
	}
	_, profile, name, err := store.Resolve("prod")
	if err != nil {
		t.Fatal(err)
	}
	if name != "prod" {
		t.Fatalf("name = %q, want %q", name, "prod")
	}
	if profile.Host != "https://prod.example.com" {
		t.Fatalf("Host = %q, want %q", profile.Host, "https://prod.example.com")
	}
	if profile.Name != "prod" {
		t.Fatalf("Name = %q, want %q (should be backfilled)", profile.Name, "prod")
	}
}

func TestResolveProfileNotFound(t *testing.T) {
	dir := t.TempDir()
	store, err := NewStore(filepath.Join(dir, "config.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	_, _, _, err = store.Resolve("nonexistent")
	if err == nil {
		t.Fatal("expected error for missing profile")
	}
	var pnf *ProfileNotFoundError
	if !errors.As(err, &pnf) {
		t.Fatalf("expected ProfileNotFoundError, got %T: %v", err, err)
	}
	if pnf.Name != "nonexistent" {
		t.Fatalf("Name = %q, want %q", pnf.Name, "nonexistent")
	}
}

func TestResolveReturnsFile(t *testing.T) {
	dir := t.TempDir()
	store, err := NewStore(filepath.Join(dir, "config.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	cfg, _, _, err := store.Resolve("")
	if err != nil {
		t.Fatal(err)
	}
	if cfg.CurrentProfile != "default" {
		t.Fatalf("file.CurrentProfile = %q, want %q", cfg.CurrentProfile, "default")
	}
	if len(cfg.Profiles) == 0 {
		t.Fatal("file.Profiles should not be empty")
	}
}

func TestProfileNotFoundError(t *testing.T) {
	err := NewProfileNotFoundError("staging")
	if err.Error() != `profile "staging" not found` {
		t.Fatalf("Error() = %q, want %q", err.Error(), `profile "staging" not found`)
	}
	var pnf *ProfileNotFoundError
	if !errors.As(err, &pnf) {
		t.Fatal("errors.As should match ProfileNotFoundError")
	}
}
