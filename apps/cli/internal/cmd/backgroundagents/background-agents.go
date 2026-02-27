package backgroundagents

import (
	"context"
	"fmt"
	"time"

	"github.com/spf13/cobra"

	"github.com/openplane/openplane/apps/cli/internal/cmd/shared"
	"github.com/openplane/openplane/apps/cli/internal/output"
	"github.com/openplane/openplane/apps/cli/internal/runtime"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "background-agents",
		Short: "Background agent orchestration",
	}
	cmd.AddCommand(newListCommand(provider))
	cmd.AddCommand(newGetCommand(provider))
	cmd.AddCommand(newCreateCommand(provider))
	cmd.AddCommand(newPauseCommand(provider))
	cmd.AddCommand(newResumeCommand(provider))
	cmd.AddCommand(newCancelCommand(provider))
	cmd.AddCommand(newDeleteCommand(provider))
	cmd.AddCommand(newLogsCommand(provider))
	return cmd
}

func newListCommand(provider shared.RuntimeProvider) *cobra.Command {
	var status string
	var limit int
	var offset int
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List background agents",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"status": status,
				"limit":  shared.IntToString(limit),
				"offset": shared.IntToString(offset),
			})
			return shared.GetAndRender(cmd.Context(), provider, "background-agents list", "/api/v1/background-agents", query, true)
		},
	}
	cmd.Flags().StringVar(&status, "status", "", "Agent status")
	cmd.Flags().IntVar(&limit, "limit", 20, "Page size")
	cmd.Flags().IntVar(&offset, "offset", 0, "Pagination offset")
	return cmd
}

func newGetCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	cmd := &cobra.Command{
		Use:   "get",
		Short: "Get background agent",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/background-agents", agentID)
			return shared.GetAndRender(cmd.Context(), provider, "background-agents get", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "id", "", "Background agent identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newCreateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var name string
	var description string
	var prompt string
	var preset string
	var sandboxType string
	var repositoryURL string
	var baseBranch string
	var timeoutMs int
	cmd := &cobra.Command{
		Use:   "create",
		Short: "Create background agent",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{
				"name":        name,
				"prompt":      prompt,
				"preset":      preset,
				"sandboxType": sandboxType,
			}
			if description != "" {
				body["description"] = description
			}
			if repositoryURL != "" {
				body["repositoryUrl"] = repositoryURL
			}
			if baseBranch != "" {
				body["baseBranch"] = baseBranch
			}
			if cmd.Flags().Changed("timeout-ms") {
				body["timeoutMs"] = timeoutMs
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "background-agents create", "/api/v1/background-agents", nil, body, true)
		},
	}
	cmd.Flags().StringVar(&name, "name", "", "Agent name")
	cmd.Flags().StringVar(&description, "description", "", "Agent description")
	cmd.Flags().StringVar(&prompt, "prompt", "", "Agent prompt")
	cmd.Flags().StringVar(&preset, "preset", "researcher", "Agent preset")
	cmd.Flags().StringVar(&sandboxType, "sandbox-type", "daytona", "Sandbox type")
	cmd.Flags().StringVar(&repositoryURL, "repository-url", "", "Repository URL")
	cmd.Flags().StringVar(&baseBranch, "base-branch", "", "Base branch")
	cmd.Flags().IntVar(&timeoutMs, "timeout-ms", 0, "Timeout in milliseconds")
	_ = cmd.MarkFlagRequired("name")
	_ = cmd.MarkFlagRequired("prompt")
	return cmd
}

func newPauseCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	cmd := &cobra.Command{
		Use:   "pause",
		Short: "Pause background agent",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/background-agents", agentID, "pause")
			return shared.PostMutationAndRender(cmd.Context(), provider, "background-agents pause", path, nil, map[string]any{}, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "id", "", "Background agent identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newResumeCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	var fromCheckpoint int
	cmd := &cobra.Command{
		Use:   "resume",
		Short: "Resume background agent",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/background-agents", agentID, "resume")
			body := map[string]any{}
			if cmd.Flags().Changed("from-checkpoint") {
				body["fromCheckpoint"] = fromCheckpoint
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "background-agents resume", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "id", "", "Background agent identifier")
	cmd.Flags().IntVar(&fromCheckpoint, "from-checkpoint", 0, "Checkpoint version")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newCancelCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	cmd := &cobra.Command{
		Use:   "cancel",
		Short: "Cancel background agent",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/background-agents", agentID, "cancel")
			return shared.PostMutationAndRender(cmd.Context(), provider, "background-agents cancel", path, nil, map[string]any{}, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "id", "", "Background agent identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newDeleteCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	cmd := &cobra.Command{
		Use:   "delete",
		Short: "Delete background agent",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/background-agents", agentID)
			return shared.DeleteMutationAndRender(cmd.Context(), provider, "background-agents delete", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&agentID, "id", "", "Background agent identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newLogsCommand(provider shared.RuntimeProvider) *cobra.Command {
	var agentID string
	var level string
	var limit int
	var offset int
	var follow bool
	var interval time.Duration
	cmd := &cobra.Command{
		Use:   "logs",
		Short: "Get background agent logs",
		RunE: func(cmd *cobra.Command, args []string) error {
			if !follow {
				query := shared.QueryFromMap(map[string]string{
					"level":  level,
					"limit":  shared.IntToString(limit),
					"offset": shared.IntToString(offset),
				})
				path := shared.Path("/api/v1/background-agents", agentID, "logs")
				return shared.GetAndRender(cmd.Context(), provider, "background-agents logs", path, query, true)
			}
			return followLogs(cmd.Context(), provider, agentID, level, limit, interval)
		},
	}
	cmd.Flags().StringVar(&agentID, "id", "", "Background agent identifier")
	cmd.Flags().StringVar(&level, "level", "", "Log level")
	cmd.Flags().IntVar(&limit, "limit", 100, "Page size")
	cmd.Flags().IntVar(&offset, "offset", 0, "Pagination offset")
	cmd.Flags().BoolVar(&follow, "follow", false, "Follow logs")
	cmd.Flags().DurationVar(&interval, "interval", 2*time.Second, "Follow poll interval")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func followLogs(
	ctx context.Context,
	provider shared.RuntimeProvider,
	agentID string,
	level string,
	limit int,
	interval time.Duration,
) error {
	rt, err := provider()
	if err != nil {
		return err
	}
	if err := rt.RequireAPIKey(); err != nil {
		return err
	}

	seen := map[string]struct{}{}
	for {
		query := shared.QueryFromMap(map[string]string{
			"level":  level,
			"limit":  shared.IntToString(limit),
			"offset": "0",
		})
		path := shared.Path("/api/v1/background-agents", agentID, "logs")
		result, _, requestErr := rt.Get(ctx, path, query)
		if requestErr != nil {
			return requestErr
		}

		entries := extractLogEntries(result)
		for i := len(entries) - 1; i >= 0; i-- {
			entry := entries[i]
			id, _ := entry["id"].(string)
			if id == "" {
				continue
			}
			if _, exists := seen[id]; exists {
				continue
			}
			seen[id] = struct{}{}
			if err := renderLogEntry(rt, entry); err != nil {
				return err
			}
		}

		select {
		case <-ctx.Done():
			return nil
		case <-time.After(interval):
		}
	}
}

func extractLogEntries(result any) []map[string]any {
	payload, ok := result.(map[string]any)
	if !ok {
		return nil
	}
	items, ok := payload["items"].([]any)
	if !ok {
		return nil
	}
	entries := make([]map[string]any, 0, len(items))
	for _, item := range items {
		entry, castOK := item.(map[string]any)
		if !castOK {
			continue
		}
		entries = append(entries, entry)
	}
	return entries
}

func renderLogEntry(rt *runtime.Runtime, entry map[string]any) error {
	if rt.Output.Format == output.FormatTable {
		createdAt, _ := entry["createdAt"].(string)
		level, _ := entry["level"].(string)
		message, _ := entry["message"].(string)
		runtime.WriteString(rt.Streams.Out, fmt.Sprintf("%s [%s] %s\n", createdAt, level, message))
		return nil
	}
	return output.Render(rt.Streams.Out, entry, rt.Output)
}
