package auth

import "testing"

func TestRedactAPIKey(t *testing.T) {
	short := redactAPIKey("short")
	if short != "********" {
		t.Fatalf("unexpected short redaction: %s", short)
	}

	value := redactAPIKey("abcd1234efgh5678")
	if value != "abcd...5678" {
		t.Fatalf("unexpected redaction: %s", value)
	}
}

func TestResolveTeamID(t *testing.T) {
	fromFlag, err := resolveTeamID("team_flag", "team_profile")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if fromFlag != "team_flag" {
		t.Fatalf("unexpected team from flag: %s", fromFlag)
	}

	fromProfile, err := resolveTeamID("", "team_profile")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if fromProfile != "team_profile" {
		t.Fatalf("unexpected team from profile: %s", fromProfile)
	}

	if _, err := resolveTeamID("", ""); err == nil {
		t.Fatal("expected missing team error")
	}
}
