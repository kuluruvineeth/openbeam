package control

import (
	"testing"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/shared"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/runtime"
)

func nopProvider() shared.RuntimeProvider {
	return func() (*runtime.Runtime, error) {
		return &runtime.Runtime{}, nil
	}
}

func TestNewCommandSubcommands(t *testing.T) {
	cmd := NewCommand(nopProvider())
	want := map[string]bool{
		"agents":    true,
		"issues":    true,
		"projects":  true,
		"goals":     true,
		"approvals": true,
		"costs":     true,
		"activity":  true,
		"runs":      true,
		"dashboard": true,
	}
	for _, sub := range cmd.Commands() {
		if !want[sub.Use] {
			t.Errorf("unexpected subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	for missing := range want {
		t.Errorf("missing subcommand: %s", missing)
	}
}

func TestAgentsSubcommands(t *testing.T) {
	cmd := newAgentsCommand(nopProvider())
	want := map[string]bool{
		"list":      true,
		"get":       true,
		"create":    true,
		"wake":      true,
		"pause":     true,
		"terminate": true,
	}
	for _, sub := range cmd.Commands() {
		if !want[sub.Use] {
			t.Errorf("unexpected agents subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	for missing := range want {
		t.Errorf("missing agents subcommand: %s", missing)
	}
}

func TestAgentsListFlags(t *testing.T) {
	cmd := newAgentsListCommand(nopProvider())
	defaults := map[string]string{
		"status": "",
		"limit":  "20",
		"offset": "0",
	}
	for name, wantDef := range defaults {
		f := cmd.Flags().Lookup(name)
		if f == nil {
			t.Errorf("flag --%s not found", name)
			continue
		}
		if f.DefValue != wantDef {
			t.Errorf("flag --%s default = %q, want %q", name, f.DefValue, wantDef)
		}
	}
}

func TestAgentsGetRequiredFlags(t *testing.T) {
	cmd := newAgentsGetCommand(nopProvider())
	if f := cmd.Flags().Lookup("id"); f == nil {
		t.Fatal("id flag not found")
	}
}

func TestAgentsCreateRequiredFlags(t *testing.T) {
	cmd := newAgentsCreateCommand(nopProvider())
	required := []string{"name", "role", "adapter-type"}
	for _, name := range required {
		f := cmd.Flags().Lookup(name)
		if f == nil {
			t.Errorf("required flag --%s not found", name)
		}
	}
}

func TestAgentsCreateOptionalFlags(t *testing.T) {
	cmd := newAgentsCreateCommand(nopProvider())
	if f := cmd.Flags().Lookup("config"); f == nil || f.DefValue != "{}" {
		t.Error("expected config flag with default {}")
	}
}

func TestAgentsWakeFlags(t *testing.T) {
	cmd := newAgentsWakeCommand(nopProvider())
	if f := cmd.Flags().Lookup("id"); f == nil {
		t.Fatal("id flag not found")
	}
	if f := cmd.Flags().Lookup("reason"); f == nil {
		t.Fatal("reason flag not found")
	}
}

func TestIssuesSubcommands(t *testing.T) {
	cmd := newIssuesCommand(nopProvider())
	want := map[string]bool{
		"list":     true,
		"get":      true,
		"create":   true,
		"update":   true,
		"comment":  true,
		"checkout": true,
		"release":  true,
	}
	for _, sub := range cmd.Commands() {
		if !want[sub.Use] {
			t.Errorf("unexpected issues subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	for missing := range want {
		t.Errorf("missing issues subcommand: %s", missing)
	}
}

func TestIssuesListFlags(t *testing.T) {
	cmd := newIssuesListCommand(nopProvider())
	flags := []string{"status", "assignee", "project", "limit"}
	for _, name := range flags {
		if f := cmd.Flags().Lookup(name); f == nil {
			t.Errorf("flag --%s not found", name)
		}
	}
}

func TestIssuesCreateRequiredFlags(t *testing.T) {
	cmd := newIssuesCreateCommand(nopProvider())
	if f := cmd.Flags().Lookup("title"); f == nil {
		t.Fatal("title flag not found")
	}
}

func TestIssuesCheckoutRequiredFlags(t *testing.T) {
	cmd := newIssuesCheckoutCommand(nopProvider())
	required := []string{"id", "agent-id"}
	for _, name := range required {
		if f := cmd.Flags().Lookup(name); f == nil {
			t.Errorf("required flag --%s not found", name)
		}
	}
}

func TestIssuesCommentRequiredFlags(t *testing.T) {
	cmd := newIssuesCommentCommand(nopProvider())
	required := []string{"id", "body"}
	for _, name := range required {
		if f := cmd.Flags().Lookup(name); f == nil {
			t.Errorf("required flag --%s not found", name)
		}
	}
}

func TestProjectsSubcommands(t *testing.T) {
	cmd := newProjectsCommand(nopProvider())
	want := map[string]bool{
		"list":   true,
		"get":    true,
		"create": true,
		"update": true,
		"delete": true,
	}
	for _, sub := range cmd.Commands() {
		if !want[sub.Use] {
			t.Errorf("unexpected projects subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	for missing := range want {
		t.Errorf("missing projects subcommand: %s", missing)
	}
}

func TestGoalsSubcommands(t *testing.T) {
	cmd := newGoalsCommand(nopProvider())
	want := map[string]bool{
		"list":   true,
		"get":    true,
		"create": true,
		"update": true,
		"delete": true,
	}
	for _, sub := range cmd.Commands() {
		if !want[sub.Use] {
			t.Errorf("unexpected goals subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	for missing := range want {
		t.Errorf("missing goals subcommand: %s", missing)
	}
}

func TestApprovalsSubcommands(t *testing.T) {
	cmd := newApprovalsCommand(nopProvider())
	want := map[string]bool{
		"list":    true,
		"get":     true,
		"approve": true,
		"reject":  true,
		"comment": true,
	}
	for _, sub := range cmd.Commands() {
		if !want[sub.Use] {
			t.Errorf("unexpected approvals subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	for missing := range want {
		t.Errorf("missing approvals subcommand: %s", missing)
	}
}

func TestApprovalsListFlags(t *testing.T) {
	cmd := newApprovalsListCommand(nopProvider())
	flags := []string{"status", "type"}
	for _, name := range flags {
		if f := cmd.Flags().Lookup(name); f == nil {
			t.Errorf("flag --%s not found", name)
		}
	}
}

func TestApprovalsRejectFlags(t *testing.T) {
	cmd := newApprovalsRejectCommand(nopProvider())
	if f := cmd.Flags().Lookup("id"); f == nil {
		t.Fatal("id flag not found")
	}
	if f := cmd.Flags().Lookup("note"); f == nil {
		t.Fatal("note flag not found")
	}
}

func TestCostsSubcommands(t *testing.T) {
	cmd := newCostsCommand(nopProvider())
	want := map[string]bool{
		"summary":    true,
		"by-agent":   true,
		"by-project": true,
	}
	for _, sub := range cmd.Commands() {
		if !want[sub.Use] {
			t.Errorf("unexpected costs subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	for missing := range want {
		t.Errorf("missing costs subcommand: %s", missing)
	}
}

func TestCostsSummaryFlags(t *testing.T) {
	cmd := newCostsSummaryCommand(nopProvider())
	flags := []string{"from", "to"}
	for _, name := range flags {
		if f := cmd.Flags().Lookup(name); f == nil {
			t.Errorf("flag --%s not found", name)
		}
	}
}

func TestCostsByAgentRequiredFlags(t *testing.T) {
	cmd := newCostsByAgentCommand(nopProvider())
	if f := cmd.Flags().Lookup("agent-id"); f == nil {
		t.Fatal("agent-id flag not found")
	}
}

func TestCostsByProjectRequiredFlags(t *testing.T) {
	cmd := newCostsByProjectCommand(nopProvider())
	if f := cmd.Flags().Lookup("project-id"); f == nil {
		t.Fatal("project-id flag not found")
	}
}

func TestActivitySubcommands(t *testing.T) {
	cmd := newActivityCommand(nopProvider())
	want := map[string]bool{
		"list": true,
	}
	for _, sub := range cmd.Commands() {
		if !want[sub.Use] {
			t.Errorf("unexpected activity subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	for missing := range want {
		t.Errorf("missing activity subcommand: %s", missing)
	}
}

func TestActivityListFlags(t *testing.T) {
	cmd := newActivityListCommand(nopProvider())
	flags := []string{"agent-id", "entity-type", "limit"}
	for _, name := range flags {
		if f := cmd.Flags().Lookup(name); f == nil {
			t.Errorf("flag --%s not found", name)
		}
	}
	if f := cmd.Flags().Lookup("limit"); f == nil || f.DefValue != "50" {
		t.Error("expected limit flag with default 50")
	}
}

func TestRunsSubcommands(t *testing.T) {
	cmd := newRunsCommand(nopProvider())
	want := map[string]bool{
		"list":  true,
		"get":   true,
		"watch": true,
	}
	for _, sub := range cmd.Commands() {
		if !want[sub.Use] {
			t.Errorf("unexpected runs subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	for missing := range want {
		t.Errorf("missing runs subcommand: %s", missing)
	}
}

func TestRunsListFlags(t *testing.T) {
	cmd := newRunsListCommand(nopProvider())
	flags := []string{"agent-id", "status", "limit"}
	for _, name := range flags {
		if f := cmd.Flags().Lookup(name); f == nil {
			t.Errorf("flag --%s not found", name)
		}
	}
}

func TestRunsWatchFlags(t *testing.T) {
	cmd := newRunsWatchCommand(nopProvider())
	if f := cmd.Flags().Lookup("id"); f == nil {
		t.Fatal("id flag not found")
	}
}

func TestDashboardSubcommands(t *testing.T) {
	cmd := newDashboardCommand(nopProvider())
	want := map[string]bool{
		"get": true,
	}
	for _, sub := range cmd.Commands() {
		if !want[sub.Use] {
			t.Errorf("unexpected dashboard subcommand: %s", sub.Use)
		}
		delete(want, sub.Use)
	}
	for missing := range want {
		t.Errorf("missing dashboard subcommand: %s", missing)
	}
}

func TestIssuesUpdateFlags(t *testing.T) {
	cmd := newIssuesUpdateCommand(nopProvider())
	required := []string{"id"}
	for _, name := range required {
		if f := cmd.Flags().Lookup(name); f == nil {
			t.Errorf("required flag --%s not found", name)
		}
	}
	optional := []string{"status", "title", "assignee"}
	for _, name := range optional {
		if f := cmd.Flags().Lookup(name); f == nil {
			t.Errorf("optional flag --%s not found", name)
		}
	}
}

func TestProjectsCreateRequiredFlags(t *testing.T) {
	cmd := newProjectsCreateCommand(nopProvider())
	if f := cmd.Flags().Lookup("name"); f == nil {
		t.Fatal("name flag not found")
	}
}

func TestGoalsCreateRequiredFlags(t *testing.T) {
	cmd := newGoalsCreateCommand(nopProvider())
	if f := cmd.Flags().Lookup("name"); f == nil {
		t.Fatal("name flag not found")
	}
}
