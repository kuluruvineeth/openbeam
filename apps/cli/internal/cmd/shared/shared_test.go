package shared

import (
	"bytes"
	"context"
	"testing"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/runtime"
)

func TestQueryFromMapAndLists(t *testing.T) {
	query := QueryFromMapAndLists(
		map[string]string{"q": "test", "limit": "10", "empty": ""},
		map[string][]string{"type": {"a", "", "b"}},
	)
	if query.Get("q") != "test" {
		t.Fatalf("missing q")
	}
	if query.Get("limit") != "10" {
		t.Fatalf("missing limit")
	}
	if got := query["type"]; len(got) != 2 {
		t.Fatalf("unexpected list count: %d", len(got))
	}
}

func TestParseJSONObject(t *testing.T) {
	value, err := ParseJSONObject(`{"enabled":true,"count":2}`)
	if err != nil {
		t.Fatal(err)
	}
	if raw, ok := value["enabled"].(bool); !ok || !raw {
		t.Fatalf("unexpected enabled value: %#v", value["enabled"])
	}
	if _, err := ParseJSONObject("{"); err == nil {
		t.Fatal("expected parse error")
	}
}

func TestPath(t *testing.T) {
	value := Path("/api/v1/search/thread", "team/a", "x y")
	if value != "/api/v1/search/thread/team%2Fa/x%20y" {
		t.Fatalf("unexpected path: %s", value)
	}
}

func TestSetOptionalInt(t *testing.T) {
	query := QueryFromMap(map[string]string{})
	SetOptionalInt(query, "limit", 0)
	if query.Get("limit") != "" {
		t.Error("zero value should not be set")
	}
	SetOptionalInt(query, "limit", 25)
	if query.Get("limit") != "25" {
		t.Errorf("limit = %q, want 25", query.Get("limit"))
	}
}

func TestSetOptionalInt64(t *testing.T) {
	query := QueryFromMap(map[string]string{})
	SetOptionalInt64(query, "from_date", 0)
	if query.Get("from_date") != "" {
		t.Error("zero value should not be set")
	}
	SetOptionalInt64(query, "from_date", 1700000000)
	if query.Get("from_date") != "1700000000" {
		t.Errorf("from_date = %q, want 1700000000", query.Get("from_date"))
	}
}

func TestIntToString(t *testing.T) {
	if IntToString(42) != "42" {
		t.Errorf("IntToString(42) = %q", IntToString(42))
	}
	if IntToString(0) != "0" {
		t.Errorf("IntToString(0) = %q", IntToString(0))
	}
}

func TestInt64ToString(t *testing.T) {
	if Int64ToString(1700000000) != "1700000000" {
		t.Errorf("Int64ToString(1700000000) = %q", Int64ToString(1700000000))
	}
}

func TestPostMutationAndRenderRequiresYesInNonInteractiveMode(t *testing.T) {
	provider := func() (*runtime.Runtime, error) {
		return &runtime.Runtime{
			Streams: runtime.Streams{Out: bytes.NewBuffer(nil), Err: bytes.NewBuffer(nil)},
			Options: runtime.GlobalOptions{
				NonInteractive: true,
				Yes:            false,
			},
		}, nil
	}
	err := PostMutationAndRender(
		context.Background(),
		provider,
		"test mutation",
		"/api/v1/test",
		nil,
		map[string]any{"ok": true},
		false,
	)
	if err == nil {
		t.Fatal("expected non-interactive mutation error")
	}
}
