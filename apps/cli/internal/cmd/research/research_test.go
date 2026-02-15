package research

import "testing"

func TestBuildStartBody(t *testing.T) {
	body := buildStartBody("find market trends", 0, false)
	if body["prompt"] != "find market trends" {
		t.Fatalf("expected prompt to be set, got %v", body["prompt"])
	}
	if _, hasOptions := body["options"]; hasOptions {
		t.Fatal("expected options to be omitted when max-steps is not set")
	}

	body = buildStartBody("find market trends", 12, true)
	rawOptions, hasOptions := body["options"]
	if !hasOptions {
		t.Fatal("expected options to be present when max-steps is set")
	}
	options, ok := rawOptions.(map[string]any)
	if !ok {
		t.Fatalf("expected options map, got %T", rawOptions)
	}
	if options["maxSteps"] != 12 {
		t.Fatalf("expected maxSteps=12, got %v", options["maxSteps"])
	}
}
