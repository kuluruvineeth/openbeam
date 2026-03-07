package runtime

import (
	"bytes"
	"testing"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/api"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/output"
)

func TestWriteEnvelopeRawString(t *testing.T) {
	out := bytes.NewBuffer(nil)
	rt := &Runtime{
		Streams: Streams{Out: out},
		Output: output.Options{
			Format: output.FormatTable,
			Raw:    true,
		},
	}
	err := rt.WriteEnvelope("test", "plain", api.Metadata{})
	if err != nil {
		t.Fatal(err)
	}
	if out.String() != "plain\n" {
		t.Fatalf("unexpected raw output: %q", out.String())
	}
}

func TestWriteEnvelopeRawObject(t *testing.T) {
	out := bytes.NewBuffer(nil)
	rt := &Runtime{
		Streams: Streams{Out: out},
		Output: output.Options{
			Format: output.FormatTable,
			Raw:    true,
		},
	}
	err := rt.WriteEnvelope("test", map[string]any{"ok": true}, api.Metadata{})
	if err != nil {
		t.Fatal(err)
	}
	if out.String() == "" {
		t.Fatal("expected JSON output")
	}
}

func TestRequireYesForNonInteractive(t *testing.T) {
	rt := &Runtime{Options: GlobalOptions{NonInteractive: true, Yes: false}}
	if err := rt.RequireYesForNonInteractive(); err == nil {
		t.Fatal("expected error when --non-interactive is used without --yes")
	}

	rt = &Runtime{Options: GlobalOptions{NonInteractive: true, Yes: true}}
	if err := rt.RequireYesForNonInteractive(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	rt = &Runtime{Options: GlobalOptions{NonInteractive: false, Yes: false}}
	if err := rt.RequireYesForNonInteractive(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
