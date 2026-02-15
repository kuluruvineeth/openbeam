package canvas

import "testing"

func TestParseJSONArray(t *testing.T) {
	values, err := parseJSONArray(`["a",{"b":1}]`)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(values) != 2 {
		t.Fatalf("expected 2 items, got %d", len(values))
	}

	_, err = parseJSONArray(`{"not":"array"}`)
	if err == nil {
		t.Fatal("expected error for non-array json")
	}
}

func TestParseJSONValue(t *testing.T) {
	value, err := parseJSONValue(`{"ok":true}`)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	parsed, ok := value.(map[string]any)
	if !ok {
		t.Fatalf("expected map payload, got %T", value)
	}
	okValue, hasOK := parsed["ok"].(bool)
	if !hasOK || !okValue {
		t.Fatal("expected ok=true")
	}

	_, err = parseJSONValue(`{"ok":`)
	if err == nil {
		t.Fatal("expected parse error")
	}
}
