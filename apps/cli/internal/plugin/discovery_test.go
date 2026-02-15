package plugin

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestLookupHonorsDirectoryPrecedence(t *testing.T) {
	firstDir := t.TempDir()
	secondDir := t.TempDir()
	filename := ExecutableName("openplane", "demo")

	firstPath := filepath.Join(firstDir, filename)
	secondPath := filepath.Join(secondDir, filename)
	if err := writeExecutable(firstPath, "first"); err != nil {
		t.Fatal(err)
	}
	if err := writeExecutable(secondPath, "second"); err != nil {
		t.Fatal(err)
	}

	candidate, found, err := Lookup("openplane", "demo", []string{firstDir, secondDir})
	if err != nil {
		t.Fatal(err)
	}
	if !found {
		t.Fatal("expected plugin to be discovered")
	}
	if candidate.Path != firstPath {
		t.Fatalf("unexpected plugin path: %s", candidate.Path)
	}
}

func TestInstallLocalCreatesDiscoverablePlugin(t *testing.T) {
	sourceDir := t.TempDir()
	installDir := t.TempDir()
	sourcePath := filepath.Join(sourceDir, "source-plugin")
	if err := writeExecutable(sourcePath, "payload"); err != nil {
		t.Fatal(err)
	}

	result, err := InstallLocal("openplane", "Data-Export", sourcePath, installDir)
	if err != nil {
		t.Fatal(err)
	}

	expectedName := "data-export"
	if result.Name != expectedName {
		t.Fatalf("unexpected plugin name: %s", result.Name)
	}
	if filepath.Base(result.Path) != ExecutableName("openplane", expectedName) {
		t.Fatalf("unexpected target binary: %s", result.Path)
	}

	candidate, found, err := Lookup("openplane", expectedName, []string{installDir})
	if err != nil {
		t.Fatal(err)
	}
	if !found {
		t.Fatal("expected installed plugin to be discoverable")
	}
	if candidate.Path != result.Path {
		t.Fatalf("unexpected candidate path: %s", candidate.Path)
	}
}

func writeExecutable(path string, content string) error {
	mode := os.FileMode(0o700)
	if runtime.GOOS != "windows" {
		mode = 0o755
	}
	return os.WriteFile(path, []byte(content), mode)
}
