package mission

import (
	"github.com/spf13/cobra"

	"github.com/openplane/openplane/apps/cli/internal/cmd/shared"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "mission",
		Short: "Mission orchestration",
	}
	cmd.AddCommand(newListCommand(provider))
	cmd.AddCommand(newCreateCommand(provider))
	cmd.AddCommand(newGetCommand(provider))
	cmd.AddCommand(newUpdateCommand(provider))
	cmd.AddCommand(newStartCommand(provider))
	cmd.AddCommand(newPauseCommand(provider))
	cmd.AddCommand(newResumeCommand(provider))
	cmd.AddCommand(newCancelCommand(provider))
	cmd.AddCommand(newSpawnAgentCommand(provider))
	cmd.AddCommand(newBroadcastCommand(provider))
	return cmd
}

func newListCommand(provider shared.RuntimeProvider) *cobra.Command {
	var status string
	var limit int
	var offset int
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List missions",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"status": status,
				"limit":  shared.IntToString(limit),
				"offset": shared.IntToString(offset),
			})
			return shared.GetAndRender(cmd.Context(), provider, "mission list", "/api/v1/missions", query, true)
		},
	}
	cmd.Flags().StringVar(&status, "status", "", "Mission status")
	cmd.Flags().IntVar(&limit, "limit", 20, "Page size")
	cmd.Flags().IntVar(&offset, "offset", 0, "Pagination offset")
	return cmd
}

func newCreateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var objective string
	var budgetCents int
	var maxConcurrentRuns int
	var heartbeatIntervalMin int
	var cronSchedule string
	cmd := &cobra.Command{
		Use:   "create",
		Short: "Create mission",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{
				"objective":         objective,
				"maxConcurrentRuns": maxConcurrentRuns,
			}
			if cmd.Flags().Changed("budget-cents") {
				body["budgetCents"] = budgetCents
			}
			if cmd.Flags().Changed("heartbeat-interval-min") {
				body["heartbeatIntervalMin"] = heartbeatIntervalMin
			}
			if cronSchedule != "" {
				body["cronSchedule"] = cronSchedule
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "mission create", "/api/v1/missions", nil, body, true)
		},
	}
	cmd.Flags().StringVar(&objective, "objective", "", "Mission objective")
	cmd.Flags().IntVar(&budgetCents, "budget-cents", 0, "Mission budget in cents")
	cmd.Flags().IntVar(&maxConcurrentRuns, "max-concurrent-runs", 3, "Max concurrent runs")
	cmd.Flags().IntVar(&heartbeatIntervalMin, "heartbeat-interval-min", 0, "Heartbeat interval in minutes")
	cmd.Flags().StringVar(&cronSchedule, "cron-schedule", "", "Cron schedule")
	_ = cmd.MarkFlagRequired("objective")
	return cmd
}

func newGetCommand(provider shared.RuntimeProvider) *cobra.Command {
	var missionID string
	cmd := &cobra.Command{
		Use:   "get",
		Short: "Get mission",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/missions", missionID)
			return shared.GetAndRender(cmd.Context(), provider, "mission get", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&missionID, "id", "", "Mission identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newUpdateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var missionID string
	var name string
	var objective string
	var budgetCents int
	var maxConcurrentRuns int
	var heartbeatIntervalMin int
	cmd := &cobra.Command{
		Use:   "update",
		Short: "Update mission",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{}
			if cmd.Flags().Changed("name") {
				body["name"] = name
			}
			if cmd.Flags().Changed("objective") {
				body["objective"] = objective
			}
			if cmd.Flags().Changed("budget-cents") {
				body["budgetCents"] = budgetCents
			}
			if cmd.Flags().Changed("max-concurrent-runs") {
				body["maxConcurrentRuns"] = maxConcurrentRuns
			}
			if cmd.Flags().Changed("heartbeat-interval-min") {
				body["heartbeatIntervalMin"] = heartbeatIntervalMin
			}
			path := shared.Path("/api/v1/missions", missionID)
			return shared.PatchMutationAndRender(cmd.Context(), provider, "mission update", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&missionID, "id", "", "Mission identifier")
	cmd.Flags().StringVar(&name, "name", "", "Mission name")
	cmd.Flags().StringVar(&objective, "objective", "", "Mission objective")
	cmd.Flags().IntVar(&budgetCents, "budget-cents", 0, "Mission budget in cents")
	cmd.Flags().IntVar(&maxConcurrentRuns, "max-concurrent-runs", 0, "Max concurrent runs")
	cmd.Flags().IntVar(&heartbeatIntervalMin, "heartbeat-interval-min", 0, "Heartbeat interval in minutes")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newStartCommand(provider shared.RuntimeProvider) *cobra.Command {
	var missionID string
	cmd := &cobra.Command{
		Use:   "start",
		Short: "Start mission",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/missions", missionID, "start")
			return shared.PostMutationAndRender(cmd.Context(), provider, "mission start", path, nil, map[string]any{}, true)
		},
	}
	cmd.Flags().StringVar(&missionID, "id", "", "Mission identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newPauseCommand(provider shared.RuntimeProvider) *cobra.Command {
	var missionID string
	cmd := &cobra.Command{
		Use:   "pause",
		Short: "Pause mission",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/missions", missionID, "pause")
			return shared.PostMutationAndRender(cmd.Context(), provider, "mission pause", path, nil, map[string]any{}, true)
		},
	}
	cmd.Flags().StringVar(&missionID, "id", "", "Mission identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newResumeCommand(provider shared.RuntimeProvider) *cobra.Command {
	var missionID string
	cmd := &cobra.Command{
		Use:   "resume",
		Short: "Resume mission",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/missions", missionID, "resume")
			return shared.PostMutationAndRender(cmd.Context(), provider, "mission resume", path, nil, map[string]any{}, true)
		},
	}
	cmd.Flags().StringVar(&missionID, "id", "", "Mission identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newCancelCommand(provider shared.RuntimeProvider) *cobra.Command {
	var missionID string
	cmd := &cobra.Command{
		Use:   "cancel",
		Short: "Cancel mission",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/missions", missionID, "cancel")
			return shared.PostMutationAndRender(cmd.Context(), provider, "mission cancel", path, nil, map[string]any{}, true)
		},
	}
	cmd.Flags().StringVar(&missionID, "id", "", "Mission identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newSpawnAgentCommand(provider shared.RuntimeProvider) *cobra.Command {
	var missionID string
	var name string
	var role string
	var taskID string
	var tools []string
	cmd := &cobra.Command{
		Use:   "spawn-agent",
		Short: "Spawn mission agent",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/missions", missionID, "agents", "spawn")
			body := map[string]any{
				"name":  name,
				"role":  role,
				"tools": tools,
			}
			if taskID != "" {
				body["taskId"] = taskID
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "mission spawn-agent", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&missionID, "id", "", "Mission identifier")
	cmd.Flags().StringVar(&name, "name", "", "Agent name")
	cmd.Flags().StringVar(&role, "role", "", "Agent role")
	cmd.Flags().StringVar(&taskID, "task-id", "", "Mission task identifier")
	cmd.Flags().StringSliceVar(&tools, "tool", nil, "Tool identifier")
	_ = cmd.MarkFlagRequired("id")
	_ = cmd.MarkFlagRequired("name")
	_ = cmd.MarkFlagRequired("role")
	return cmd
}

func newBroadcastCommand(provider shared.RuntimeProvider) *cobra.Command {
	var missionID string
	var content string
	cmd := &cobra.Command{
		Use:   "broadcast",
		Short: "Broadcast message to mission agents",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/missions", missionID, "broadcast")
			return shared.PostMutationAndRender(
				cmd.Context(),
				provider,
				"mission broadcast",
				path,
				nil,
				map[string]any{"content": content},
				true,
			)
		},
	}
	cmd.Flags().StringVar(&missionID, "id", "", "Mission identifier")
	cmd.Flags().StringVar(&content, "content", "", "Message content")
	_ = cmd.MarkFlagRequired("id")
	_ = cmd.MarkFlagRequired("content")
	return cmd
}
