package upgrade

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestNormalizeVersion(t *testing.T) {
	cases := map[string]string{
		"cli-v0.2.0":      "0.2.0",
		"v0.2.0":          "0.2.0",
		"0.2.0":           "0.2.0",
		"cli-v1.0.0-rc.1": "1.0.0-rc.1",
		"  0.1.0  ":       "0.1.0",
	}
	for in, want := range cases {
		if got := normalizeVersion(in); got != want {
			t.Errorf("normalizeVersion(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestIsValidSemver(t *testing.T) {
	valid := []string{"0.0.1", "1.2.3", "10.20.30", "1.0.0-rc.1", "2.5.0-beta.12"}
	invalid := []string{"", "0.1", "1.2.3.4", "v1.2.3", "cli-v1.2.3", "abc.def.ghi", "1..3"}

	for _, v := range valid {
		if !isValidSemver(v) {
			t.Errorf("isValidSemver(%q) = false, want true", v)
		}
	}
	for _, v := range invalid {
		if isValidSemver(v) {
			t.Errorf("isValidSemver(%q) = true, want false", v)
		}
	}
}

func TestArchFor(t *testing.T) {
	if archFor("amd64") != "x86_64" {
		t.Errorf("archFor(amd64) = %q, want x86_64", archFor("amd64"))
	}
	if archFor("arm64") != "arm64" {
		t.Errorf("archFor(arm64) = %q, want arm64", archFor("arm64"))
	}
	if archFor("riscv64") != "" {
		t.Errorf("archFor(riscv64) = %q, want empty", archFor("riscv64"))
	}
}

func TestResolveTarget(t *testing.T) {
	got, err := resolveTarget("0.2.0")
	if err != nil {
		t.Fatalf("resolveTarget: %v", err)
	}
	if !strings.HasPrefix(got.archive, "openbeam_0.2.0_") {
		t.Errorf("archive prefix wrong: %q", got.archive)
	}
	if got.version != "0.2.0" {
		t.Errorf("version = %q", got.version)
	}
	if runtime.GOOS == "windows" {
		if !strings.HasSuffix(got.archive, ".zip") || got.binary != "openbeam.exe" {
			t.Errorf("windows expectations: archive=%q binary=%q", got.archive, got.binary)
		}
	} else {
		if !strings.HasSuffix(got.archive, ".tar.gz") || got.binary != "openbeam" {
			t.Errorf("unix expectations: archive=%q binary=%q", got.archive, got.binary)
		}
	}
}

func TestDetectPackageManager_Homebrew(t *testing.T) {
	cellar := filepath.Join("some", "Cellar", "openbeam", "0.1.0", "bin", "openbeam")
	if detectPackageManager(cellar) != "homebrew" {
		t.Errorf("expected homebrew for Cellar path, got %q", detectPackageManager(cellar))
	}

	linuxbrew := filepath.Join("/home/user/.linuxbrew", "bin", "openbeam")
	if detectPackageManager(linuxbrew) != "homebrew" {
		t.Errorf("expected homebrew for linuxbrew path")
	}

	unmanaged := "/usr/local/bin/openbeam"
	got := detectPackageManager(unmanaged)
	if got == "homebrew" {
		t.Errorf("expected non-homebrew for %q", unmanaged)
	}
}

func TestPackageManagerGuidance(t *testing.T) {
	cases := []struct {
		manager string
		wantHint string
	}{
		{"homebrew", "brew upgrade openbeam"},
		{"scoop", "scoop update openbeam"},
		{"apt:openbeam", "apt-get install --only-upgrade openbeam"},
		{"rpm:openbeam-1.0-1", "dnf upgrade openbeam"},
		{"pacman:extra/openbeam", "pacman -Syu openbeam"},
		{"apk:openbeam-1.0-r0", "apk upgrade openbeam"},
	}
	for _, c := range cases {
		err := packageManagerGuidance(c.manager, "0.2.0", "/path/to/openbeam")
		if err == nil {
			t.Errorf("expected error for %s", c.manager)
			continue
		}
		if !strings.Contains(err.Error(), c.wantHint) {
			t.Errorf("manager=%s: missing hint %q in %q", c.manager, c.wantHint, err.Error())
		}
	}
}

func TestReadExpectedChecksum(t *testing.T) {
	dir := t.TempDir()
	checksums := filepath.Join(dir, "checksums.txt")
	content := "aaa  other.tar.gz\n" +
		"abcdef1234567890  openbeam_0.2.0_linux_x86_64.tar.gz\n" +
		"ffff  more.tar.gz\n"
	if err := os.WriteFile(checksums, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	got, err := readExpectedChecksum(checksums, "openbeam_0.2.0_linux_x86_64.tar.gz")
	if err != nil {
		t.Fatalf("readExpectedChecksum: %v", err)
	}
	if got != "abcdef1234567890" {
		t.Errorf("got %q, want abcdef1234567890", got)
	}
}

func TestReadExpectedChecksum_Missing(t *testing.T) {
	dir := t.TempDir()
	checksums := filepath.Join(dir, "checksums.txt")
	if err := os.WriteFile(checksums, []byte("aaa  other.tar.gz\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err := readExpectedChecksum(checksums, "missing.tar.gz")
	if err == nil {
		t.Fatal("expected error for missing archive")
	}
	if !strings.Contains(err.Error(), "not found") {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestVerifyChecksum(t *testing.T) {
	dir := t.TempDir()
	archive := filepath.Join(dir, "openbeam_0.2.0_linux_x86_64.tar.gz")
	if err := os.WriteFile(archive, []byte("fake archive contents"), 0o644); err != nil {
		t.Fatal(err)
	}

	hasher := sha256.New()
	hasher.Write([]byte("fake archive contents"))
	sum := hex.EncodeToString(hasher.Sum(nil))

	checksums := filepath.Join(dir, "checksums.txt")
	if err := os.WriteFile(checksums, []byte(sum+"  openbeam_0.2.0_linux_x86_64.tar.gz\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := verifyChecksum(archive, checksums, "openbeam_0.2.0_linux_x86_64.tar.gz"); err != nil {
		t.Errorf("verifyChecksum: %v", err)
	}
}

func TestVerifyChecksum_Mismatch(t *testing.T) {
	dir := t.TempDir()
	archive := filepath.Join(dir, "a.tar.gz")
	if err := os.WriteFile(archive, []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}
	checksums := filepath.Join(dir, "checksums.txt")
	if err := os.WriteFile(checksums, []byte("deadbeef  a.tar.gz\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	err := verifyChecksum(archive, checksums, "a.tar.gz")
	if err == nil || !strings.Contains(err.Error(), "checksum mismatch") {
		t.Errorf("expected checksum mismatch, got %v", err)
	}
}

func TestExtractTarGzBinary(t *testing.T) {
	dir := t.TempDir()
	archive := filepath.Join(dir, "openbeam.tar.gz")

	f, err := os.Create(archive)
	if err != nil {
		t.Fatal(err)
	}
	gz := gzip.NewWriter(f)
	tw := tar.NewWriter(gz)

	content := []byte("#!/bin/sh\necho fake openbeam\n")
	_ = tw.WriteHeader(&tar.Header{Name: "README.md", Mode: 0o644, Size: int64(len("readme"))})
	_, _ = tw.Write([]byte("readme"))
	_ = tw.WriteHeader(&tar.Header{Name: "openbeam", Mode: 0o755, Size: int64(len(content))})
	_, _ = tw.Write(content)
	_ = tw.Close()
	_ = gz.Close()
	_ = f.Close()

	extractDir := filepath.Join(dir, "extract")
	_ = os.MkdirAll(extractDir, 0o755)
	got, err := extractTarGzBinary(archive, "openbeam", extractDir)
	if err != nil {
		t.Fatalf("extractTarGzBinary: %v", err)
	}
	data, err := os.ReadFile(got)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(data), "fake openbeam") {
		t.Errorf("extracted content unexpected: %q", data)
	}
}

func TestExtractZipBinary(t *testing.T) {
	dir := t.TempDir()
	archive := filepath.Join(dir, "openbeam.zip")

	f, err := os.Create(archive)
	if err != nil {
		t.Fatal(err)
	}
	zw := zip.NewWriter(f)
	w, err := zw.Create("openbeam.exe")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := w.Write([]byte("PE-binary-placeholder")); err != nil {
		t.Fatal(err)
	}
	_ = zw.Close()
	_ = f.Close()

	extractDir := filepath.Join(dir, "extract")
	_ = os.MkdirAll(extractDir, 0o755)
	got, err := extractZipBinary(archive, "openbeam.exe", extractDir)
	if err != nil {
		t.Fatalf("extractZipBinary: %v", err)
	}
	data, err := os.ReadFile(got)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "PE-binary-placeholder" {
		t.Errorf("extracted content = %q", data)
	}
}

func TestSwapBinary(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("file locking on Windows complicates this test")
	}
	dir := t.TempDir()
	current := filepath.Join(dir, "openbeam")
	newBin := filepath.Join(dir, "openbeam.new")

	if err := os.WriteFile(current, []byte("old"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(newBin, []byte("new"), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := swapBinary(newBin, current); err != nil {
		t.Fatalf("swapBinary: %v", err)
	}
	got, err := os.ReadFile(current)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != "new" {
		t.Errorf("post-swap content = %q, want 'new'", got)
	}
	info, err := os.Stat(current)
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm()&0o100 == 0 {
		t.Errorf("post-swap binary is not executable: %v", info.Mode())
	}
}
