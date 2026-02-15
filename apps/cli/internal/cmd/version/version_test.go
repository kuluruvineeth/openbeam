package version

import (
	"bytes"
	"strings"
	"testing"
)

func TestNewCommandOutput(t *testing.T) {
	cmd := NewCommand()
	buf := &bytes.Buffer{}
	cmd.SetOut(buf)
	if err := cmd.Execute(); err != nil {
		t.Fatal(err)
	}
	output := buf.String()
	if !strings.Contains(output, Version) {
		t.Errorf("output missing version %q: %s", Version, output)
	}
	if !strings.Contains(output, "commit=") {
		t.Error("output missing commit info")
	}
	if !strings.Contains(output, "go=") {
		t.Error("output missing go version")
	}
}

func TestVersionVarsDefaultValues(t *testing.T) {
	if Version == "" {
		t.Error("Version should have a default value")
	}
	if Commit == "" {
		t.Error("Commit should have a default value")
	}
	if Date == "" {
		t.Error("Date should have a default value")
	}
}
