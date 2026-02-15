package plugin

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestComputeChecksum(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test-binary")
	if err := os.WriteFile(path, []byte("hello world"), 0o755); err != nil {
		t.Fatal(err)
	}

	checksum, err := ComputeChecksum(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(checksum) != 64 {
		t.Errorf("expected 64-char SHA256 hex, got %d chars", len(checksum))
	}

	again, err := ComputeChecksum(path)
	if err != nil {
		t.Fatal(err)
	}
	if checksum != again {
		t.Error("checksum not deterministic")
	}
}

func TestComputeChecksumDifferentContent(t *testing.T) {
	dir := t.TempDir()
	pathA := filepath.Join(dir, "a")
	pathB := filepath.Join(dir, "b")
	if err := os.WriteFile(pathA, []byte("alpha"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(pathB, []byte("bravo"), 0o755); err != nil {
		t.Fatal(err)
	}

	a, _ := ComputeChecksum(pathA)
	b, _ := ComputeChecksum(pathB)
	if a == b {
		t.Error("different content should produce different checksums")
	}
}

func TestManifestRoundTrip(t *testing.T) {
	dir := t.TempDir()
	m := &Manifest{Checksums: map[string]string{
		"plugin-a": "abc123",
		"plugin-b": "def456",
	}}
	if err := SaveManifest(dir, m); err != nil {
		t.Fatal(err)
	}
	loaded, err := LoadManifest(dir)
	if err != nil {
		t.Fatal(err)
	}
	if loaded.Checksums["plugin-a"] != "abc123" {
		t.Errorf("plugin-a = %q, want abc123", loaded.Checksums["plugin-a"])
	}
	if loaded.Checksums["plugin-b"] != "def456" {
		t.Errorf("plugin-b = %q, want def456", loaded.Checksums["plugin-b"])
	}
}

func TestLoadManifestMissing(t *testing.T) {
	dir := t.TempDir()
	m, err := LoadManifest(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(m.Checksums) != 0 {
		t.Errorf("expected empty checksums, got %d", len(m.Checksums))
	}
}

func TestRecordAndVerifyValid(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "openplane-test")
	if err := os.WriteFile(path, []byte("binary content"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := RecordChecksum(dir, "test", path); err != nil {
		t.Fatal(err)
	}
	if err := VerifyInstalled(dir, "test", path); err != nil {
		t.Errorf("verification should pass: %v", err)
	}
}

func TestVerifyInstalledTampered(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "openplane-test")
	if err := os.WriteFile(path, []byte("original"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := RecordChecksum(dir, "test", path); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte("tampered"), 0o755); err != nil {
		t.Fatal(err)
	}
	err := VerifyInstalled(dir, "test", path)
	if err == nil {
		t.Fatal("expected checksum mismatch error")
	}
	if !errors.Is(err, ErrChecksumMismatch) {
		t.Errorf("expected ErrChecksumMismatch, got: %v", err)
	}
}

func TestVerifyInstalledSkipsPathPlugins(t *testing.T) {
	installDir := t.TempDir()
	otherDir := t.TempDir()
	path := filepath.Join(otherDir, "openplane-test")
	if err := os.WriteFile(path, []byte("content"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := VerifyInstalled(installDir, "test", path); err != nil {
		t.Errorf("PATH plugins should skip verification: %v", err)
	}
}

func TestVerifyInstalledNoManifestEntry(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "openplane-test")
	if err := os.WriteFile(path, []byte("content"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := VerifyInstalled(dir, "unknown", path); err != nil {
		t.Errorf("missing manifest entry should skip verification: %v", err)
	}
}

func TestIsInsideDir(t *testing.T) {
	tests := []struct {
		path   string
		dir    string
		inside bool
	}{
		{"/home/user/plugins/my-plugin", "/home/user/plugins", true},
		{"/home/user/bin/my-plugin", "/home/user/plugins", false},
	}
	for _, tc := range tests {
		if got := isInsideDir(tc.path, tc.dir); got != tc.inside {
			t.Errorf("isInsideDir(%q, %q) = %v, want %v", tc.path, tc.dir, got, tc.inside)
		}
	}
}

func TestInstallRecordsChecksum(t *testing.T) {
	sourceDir := t.TempDir()
	installDir := t.TempDir()
	sourcePath := filepath.Join(sourceDir, "source-plugin")
	if err := writeExecutable(sourcePath, "payload"); err != nil {
		t.Fatal(err)
	}

	result, err := InstallLocal("openplane", "checksum-test", sourcePath, installDir)
	if err != nil {
		t.Fatal(err)
	}

	m, err := LoadManifest(installDir)
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := m.Checksums[result.Name]; !ok {
		t.Error("expected checksum recorded after install")
	}

	if err := VerifyInstalled(installDir, result.Name, result.Path); err != nil {
		t.Errorf("installed plugin should verify: %v", err)
	}
}
