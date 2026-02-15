package integrations

import "testing"

func TestNormalizeIntegration(t *testing.T) {
	valid := []string{"gmail", "google-drive", "linear", "notion", "slack", "SLACK"}
	for _, value := range valid {
		normalized, err := normalizeIntegration(value)
		if err != nil {
			t.Fatalf("unexpected error for %q: %v", value, err)
		}
		if normalized == "" {
			t.Fatalf("expected normalized integration for %q", value)
		}
	}

	_, err := normalizeIntegration("")
	if err == nil {
		t.Fatal("expected required integration error")
	}

	_, err = normalizeIntegration("unknown")
	if err == nil {
		t.Fatal("expected unsupported integration error")
	}
}
