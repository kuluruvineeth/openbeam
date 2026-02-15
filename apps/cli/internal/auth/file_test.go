package auth

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestDefaultFilePath(t *testing.T) {
	p, err := DefaultFilePath()
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Base(p) != "secrets.yaml" {
		t.Fatalf("DefaultFilePath() = %q, want filename secrets.yaml", p)
	}
	if !filepath.IsAbs(p) {
		t.Fatalf("DefaultFilePath() = %q, want absolute path", p)
	}
}

func TestNewFileStore(t *testing.T) {
	t.Run("explicit_path", func(t *testing.T) {
		s, err := NewFileStore("/tmp/secrets.yaml")
		if err != nil {
			t.Fatal(err)
		}
		if s == nil {
			t.Fatal("NewFileStore returned nil")
		}
	})

	t.Run("empty_path_uses_default", func(t *testing.T) {
		s, err := NewFileStore("")
		if err != nil {
			t.Fatal(err)
		}
		if s == nil {
			t.Fatal("NewFileStore returned nil")
		}
	})
}

func TestFileStoreGet(t *testing.T) {
	t.Run("returns_value", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, "secrets.yaml")
		content := []byte("values:\n  api_key: sk-12345\n  token: abc\n")
		if err := os.WriteFile(path, content, 0o600); err != nil {
			t.Fatal(err)
		}
		s, err := NewFileStore(path)
		if err != nil {
			t.Fatal(err)
		}
		val, err := s.Get("api_key")
		if err != nil {
			t.Fatal(err)
		}
		if val != "sk-12345" {
			t.Fatalf("Get(api_key) = %q, want %q", val, "sk-12345")
		}
	})

	t.Run("returns_ErrSecretNotFound_for_missing_key", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, "secrets.yaml")
		content := []byte("values:\n  api_key: sk-12345\n")
		if err := os.WriteFile(path, content, 0o600); err != nil {
			t.Fatal(err)
		}
		s, err := NewFileStore(path)
		if err != nil {
			t.Fatal(err)
		}
		_, err = s.Get("nonexistent")
		if !errors.Is(err, ErrSecretNotFound) {
			t.Fatalf("Get(nonexistent) error = %v, want ErrSecretNotFound", err)
		}
	})

	t.Run("returns_ErrSecretNotFound_for_missing_file", func(t *testing.T) {
		dir := t.TempDir()
		s, err := NewFileStore(filepath.Join(dir, "does_not_exist.yaml"))
		if err != nil {
			t.Fatal(err)
		}
		_, err = s.Get("key")
		if !errors.Is(err, ErrSecretNotFound) {
			t.Fatalf("Get() error = %v, want ErrSecretNotFound", err)
		}
	})

	t.Run("returns_ErrSecretNotFound_for_nil_values_map", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, "secrets.yaml")
		if err := os.WriteFile(path, []byte("---\n"), 0o600); err != nil {
			t.Fatal(err)
		}
		s, err := NewFileStore(path)
		if err != nil {
			t.Fatal(err)
		}
		_, err = s.Get("key")
		if !errors.Is(err, ErrSecretNotFound) {
			t.Fatalf("Get() error = %v, want ErrSecretNotFound", err)
		}
	})

	t.Run("returns_error_for_corrupt_yaml", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, "secrets.yaml")
		if err := os.WriteFile(path, []byte("{{bad yaml"), 0o600); err != nil {
			t.Fatal(err)
		}
		s, err := NewFileStore(path)
		if err != nil {
			t.Fatal(err)
		}
		_, err = s.Get("key")
		if err == nil {
			t.Fatal("expected error for corrupt yaml")
		}
		if errors.Is(err, ErrSecretNotFound) {
			t.Fatal("should not be ErrSecretNotFound for corrupt yaml")
		}
	})
}

func TestFileStoreSet(t *testing.T) {
	t.Run("creates_file_with_correct_permissions", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, "secrets.yaml")
		s, err := NewFileStore(path)
		if err != nil {
			t.Fatal(err)
		}
		if err := s.Set("token", "abc123"); err != nil {
			t.Fatal(err)
		}
		info, err := os.Stat(path)
		if err != nil {
			t.Fatalf("file not created: %v", err)
		}
		if info.Mode().Perm() != 0o600 {
			t.Fatalf("permissions = %o, want 0600", info.Mode().Perm())
		}
	})

	t.Run("creates_directories", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, "deep", "nested", "secrets.yaml")
		s, err := NewFileStore(path)
		if err != nil {
			t.Fatal(err)
		}
		if err := s.Set("key", "val"); err != nil {
			t.Fatal(err)
		}
		if _, err := os.Stat(path); err != nil {
			t.Fatalf("file not created in nested dir: %v", err)
		}
	})

	t.Run("merges_with_existing_data", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, "secrets.yaml")
		s, err := NewFileStore(path)
		if err != nil {
			t.Fatal(err)
		}
		if err := s.Set("first", "one"); err != nil {
			t.Fatal(err)
		}
		if err := s.Set("second", "two"); err != nil {
			t.Fatal(err)
		}
		v1, err := s.Get("first")
		if err != nil {
			t.Fatal(err)
		}
		if v1 != "one" {
			t.Fatalf("Get(first) = %q, want %q", v1, "one")
		}
		v2, err := s.Get("second")
		if err != nil {
			t.Fatal(err)
		}
		if v2 != "two" {
			t.Fatalf("Get(second) = %q, want %q", v2, "two")
		}
	})

	t.Run("overwrites_existing_key", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, "secrets.yaml")
		s, err := NewFileStore(path)
		if err != nil {
			t.Fatal(err)
		}
		if err := s.Set("key", "original"); err != nil {
			t.Fatal(err)
		}
		if err := s.Set("key", "updated"); err != nil {
			t.Fatal(err)
		}
		val, err := s.Get("key")
		if err != nil {
			t.Fatal(err)
		}
		if val != "updated" {
			t.Fatalf("Get(key) = %q, want %q", val, "updated")
		}
	})
}

func TestFileStoreDelete(t *testing.T) {
	t.Run("removes_key", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, "secrets.yaml")
		s, err := NewFileStore(path)
		if err != nil {
			t.Fatal(err)
		}
		if err := s.Set("key", "val"); err != nil {
			t.Fatal(err)
		}
		if err := s.Delete("key"); err != nil {
			t.Fatal(err)
		}
		_, err = s.Get("key")
		if !errors.Is(err, ErrSecretNotFound) {
			t.Fatalf("Get() after Delete() error = %v, want ErrSecretNotFound", err)
		}
	})

	t.Run("missing_key_is_noop", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, "secrets.yaml")
		s, err := NewFileStore(path)
		if err != nil {
			t.Fatal(err)
		}
		if err := s.Set("other", "val"); err != nil {
			t.Fatal(err)
		}
		if err := s.Delete("nonexistent"); err != nil {
			t.Fatalf("Delete(nonexistent) error = %v, want nil", err)
		}
		val, err := s.Get("other")
		if err != nil {
			t.Fatal(err)
		}
		if val != "val" {
			t.Fatalf("other key should be preserved, got %q", val)
		}
	})

	t.Run("missing_file_is_noop", func(t *testing.T) {
		dir := t.TempDir()
		s, err := NewFileStore(filepath.Join(dir, "not_here.yaml"))
		if err != nil {
			t.Fatal(err)
		}
		if err := s.Delete("key"); err != nil {
			t.Fatalf("Delete() on missing file error = %v, want nil", err)
		}
	})

	t.Run("preserves_other_keys", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, "secrets.yaml")
		s, err := NewFileStore(path)
		if err != nil {
			t.Fatal(err)
		}
		if err := s.Set("keep", "yes"); err != nil {
			t.Fatal(err)
		}
		if err := s.Set("remove", "no"); err != nil {
			t.Fatal(err)
		}
		if err := s.Delete("remove"); err != nil {
			t.Fatal(err)
		}
		val, err := s.Get("keep")
		if err != nil {
			t.Fatal(err)
		}
		if val != "yes" {
			t.Fatalf("Get(keep) = %q, want %q", val, "yes")
		}
		_, err = s.Get("remove")
		if !errors.Is(err, ErrSecretNotFound) {
			t.Fatalf("Get(remove) after Delete error = %v, want ErrSecretNotFound", err)
		}
	})
}

func TestFileStoreRoundTrip(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "secrets.yaml")
	s, err := NewFileStore(path)
	if err != nil {
		t.Fatal(err)
	}

	secrets := map[string]string{
		"api_key":       "sk-abc123",
		"refresh_token": "rt-xyz789",
		"session":       "sess-111",
	}

	for k, v := range secrets {
		if err := s.Set(k, v); err != nil {
			t.Fatalf("Set(%q) error = %v", k, err)
		}
	}

	for k, want := range secrets {
		got, err := s.Get(k)
		if err != nil {
			t.Fatalf("Get(%q) error = %v", k, err)
		}
		if got != want {
			t.Fatalf("Get(%q) = %q, want %q", k, got, want)
		}
	}
}

func TestFileStoreImplementsStoreInterface(t *testing.T) {
	dir := t.TempDir()
	s, err := NewFileStore(filepath.Join(dir, "secrets.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	var _ Store = s
}
