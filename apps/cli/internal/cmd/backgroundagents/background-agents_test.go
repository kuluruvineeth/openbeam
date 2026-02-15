package backgroundagents

import "testing"

func TestExtractLogEntries(t *testing.T) {
	entries := extractLogEntries(map[string]any{
		"items": []any{
			map[string]any{"id": "1", "message": "a"},
			map[string]any{"id": "2", "message": "b"},
		},
	})

	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
	if entries[0]["id"] != "1" {
		t.Fatalf("expected first id=1, got %v", entries[0]["id"])
	}

	empty := extractLogEntries(map[string]any{"items": "invalid"})
	if len(empty) != 0 {
		t.Fatalf("expected empty entries, got %d", len(empty))
	}
}
