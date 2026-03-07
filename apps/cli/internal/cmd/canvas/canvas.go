package canvas

import (
	"encoding/json"

	"github.com/spf13/cobra"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/shared"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "canvas",
		Short: "Agent canvas orchestration",
	}
	cmd.AddCommand(newListCommand(provider))
	cmd.AddCommand(newCreateCommand(provider))
	cmd.AddCommand(newGetCommand(provider))
	cmd.AddCommand(newUpdateCommand(provider))
	cmd.AddCommand(newDeleteCommand(provider))
	cmd.AddCommand(newPublishCommand(provider))
	cmd.AddCommand(newExecutionsCommand(provider))
	cmd.AddCommand(newExecuteCommand(provider))
	return cmd
}

func newListCommand(provider shared.RuntimeProvider) *cobra.Command {
	var status string
	var limit int
	var offset int
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List canvases",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"status": status,
				"limit":  shared.IntToString(limit),
				"offset": shared.IntToString(offset),
			})
			return shared.GetAndRender(cmd.Context(), provider, "canvas list", "/api/v1/canvas", query, true)
		},
	}
	cmd.Flags().StringVar(&status, "status", "", "Canvas status")
	cmd.Flags().IntVar(&limit, "limit", 20, "Page size")
	cmd.Flags().IntVar(&offset, "offset", 0, "Pagination offset")
	return cmd
}

func newCreateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var name string
	var description string
	var icon string
	var nodesJSON string
	var edgesJSON string
	var viewportJSON string
	var settingsJSON string
	var triggerType string
	var triggerConfigJSON string
	cmd := &cobra.Command{
		Use:   "create",
		Short: "Create canvas",
		RunE: func(cmd *cobra.Command, args []string) error {
			nodes, err := parseJSONArray(nodesJSON)
			if err != nil {
				return errs.New(errs.KindUsage, "invalid --nodes JSON", err)
			}
			edges, err := parseJSONArray(edgesJSON)
			if err != nil {
				return errs.New(errs.KindUsage, "invalid --edges JSON", err)
			}
			body := map[string]any{
				"name":  name,
				"nodes": nodes,
				"edges": edges,
			}
			if description != "" {
				body["description"] = description
			}
			if icon != "" {
				body["icon"] = icon
			}
			if triggerType != "" {
				body["triggerType"] = triggerType
			}
			if viewportJSON != "" {
				viewport, parseErr := parseJSONValue(viewportJSON)
				if parseErr != nil {
					return errs.New(errs.KindUsage, "invalid --viewport JSON", parseErr)
				}
				body["viewport"] = viewport
			}
			if settingsJSON != "" {
				settings, parseErr := parseJSONValue(settingsJSON)
				if parseErr != nil {
					return errs.New(errs.KindUsage, "invalid --settings JSON", parseErr)
				}
				body["settings"] = settings
			}
			if triggerConfigJSON != "" {
				triggerConfig, parseErr := parseJSONValue(triggerConfigJSON)
				if parseErr != nil {
					return errs.New(errs.KindUsage, "invalid --trigger-config JSON", parseErr)
				}
				body["triggerConfig"] = triggerConfig
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "canvas create", "/api/v1/canvas", nil, body, true)
		},
	}
	cmd.Flags().StringVar(&name, "name", "", "Canvas name")
	cmd.Flags().StringVar(&description, "description", "", "Canvas description")
	cmd.Flags().StringVar(&icon, "icon", "", "Canvas icon")
	cmd.Flags().StringVar(&nodesJSON, "nodes", "[]", "Canvas nodes JSON array")
	cmd.Flags().StringVar(&edgesJSON, "edges", "[]", "Canvas edges JSON array")
	cmd.Flags().StringVar(&viewportJSON, "viewport", "", "Canvas viewport JSON")
	cmd.Flags().StringVar(&settingsJSON, "settings", "", "Canvas settings JSON")
	cmd.Flags().StringVar(&triggerType, "trigger-type", "", "Canvas trigger type")
	cmd.Flags().StringVar(&triggerConfigJSON, "trigger-config", "", "Canvas trigger config JSON")
	_ = cmd.MarkFlagRequired("name")
	return cmd
}

func newGetCommand(provider shared.RuntimeProvider) *cobra.Command {
	var canvasID string
	cmd := &cobra.Command{
		Use:   "get",
		Short: "Get canvas",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/canvas", canvasID)
			return shared.GetAndRender(cmd.Context(), provider, "canvas get", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&canvasID, "id", "", "Canvas identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newUpdateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var canvasID string
	var name string
	var description string
	var icon string
	var nodesJSON string
	var edgesJSON string
	var viewportJSON string
	var settingsJSON string
	var triggerType string
	var triggerConfigJSON string
	cmd := &cobra.Command{
		Use:   "update",
		Short: "Update canvas",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{}
			if cmd.Flags().Changed("name") {
				body["name"] = name
			}
			if cmd.Flags().Changed("description") {
				body["description"] = description
			}
			if cmd.Flags().Changed("icon") {
				body["icon"] = icon
			}
			if cmd.Flags().Changed("trigger-type") {
				body["triggerType"] = triggerType
			}
			if cmd.Flags().Changed("nodes") {
				nodes, err := parseJSONArray(nodesJSON)
				if err != nil {
					return errs.New(errs.KindUsage, "invalid --nodes JSON", err)
				}
				body["nodes"] = nodes
			}
			if cmd.Flags().Changed("edges") {
				edges, err := parseJSONArray(edgesJSON)
				if err != nil {
					return errs.New(errs.KindUsage, "invalid --edges JSON", err)
				}
				body["edges"] = edges
			}
			if cmd.Flags().Changed("viewport") {
				viewport, err := parseJSONValue(viewportJSON)
				if err != nil {
					return errs.New(errs.KindUsage, "invalid --viewport JSON", err)
				}
				body["viewport"] = viewport
			}
			if cmd.Flags().Changed("settings") {
				settings, err := parseJSONValue(settingsJSON)
				if err != nil {
					return errs.New(errs.KindUsage, "invalid --settings JSON", err)
				}
				body["settings"] = settings
			}
			if cmd.Flags().Changed("trigger-config") {
				triggerConfig, err := parseJSONValue(triggerConfigJSON)
				if err != nil {
					return errs.New(errs.KindUsage, "invalid --trigger-config JSON", err)
				}
				body["triggerConfig"] = triggerConfig
			}
			path := shared.Path("/api/v1/canvas", canvasID)
			return shared.PatchMutationAndRender(cmd.Context(), provider, "canvas update", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&canvasID, "id", "", "Canvas identifier")
	cmd.Flags().StringVar(&name, "name", "", "Canvas name")
	cmd.Flags().StringVar(&description, "description", "", "Canvas description")
	cmd.Flags().StringVar(&icon, "icon", "", "Canvas icon")
	cmd.Flags().StringVar(&nodesJSON, "nodes", "[]", "Canvas nodes JSON array")
	cmd.Flags().StringVar(&edgesJSON, "edges", "[]", "Canvas edges JSON array")
	cmd.Flags().StringVar(&viewportJSON, "viewport", "", "Canvas viewport JSON")
	cmd.Flags().StringVar(&settingsJSON, "settings", "", "Canvas settings JSON")
	cmd.Flags().StringVar(&triggerType, "trigger-type", "", "Canvas trigger type")
	cmd.Flags().StringVar(&triggerConfigJSON, "trigger-config", "", "Canvas trigger config JSON")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newDeleteCommand(provider shared.RuntimeProvider) *cobra.Command {
	var canvasID string
	cmd := &cobra.Command{
		Use:   "delete",
		Short: "Delete canvas",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/canvas", canvasID)
			return shared.DeleteMutationAndRender(cmd.Context(), provider, "canvas delete", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&canvasID, "id", "", "Canvas identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newPublishCommand(provider shared.RuntimeProvider) *cobra.Command {
	var canvasID string
	var changelog string
	cmd := &cobra.Command{
		Use:   "publish",
		Short: "Publish canvas",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/canvas", canvasID, "publish")
			body := map[string]any{}
			if changelog != "" {
				body["changelog"] = changelog
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "canvas publish", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&canvasID, "id", "", "Canvas identifier")
	cmd.Flags().StringVar(&changelog, "changelog", "", "Release notes")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newExecutionsCommand(provider shared.RuntimeProvider) *cobra.Command {
	var canvasID string
	var status string
	var limit int
	var offset int
	cmd := &cobra.Command{
		Use:   "executions",
		Short: "List canvas executions",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/canvas", canvasID, "executions")
			query := shared.QueryFromMap(map[string]string{
				"status": status,
				"limit":  shared.IntToString(limit),
				"offset": shared.IntToString(offset),
			})
			return shared.GetAndRender(cmd.Context(), provider, "canvas executions", path, query, true)
		},
	}
	cmd.Flags().StringVar(&canvasID, "id", "", "Canvas identifier")
	cmd.Flags().StringVar(&status, "status", "", "Execution status")
	cmd.Flags().IntVar(&limit, "limit", 20, "Page size")
	cmd.Flags().IntVar(&offset, "offset", 0, "Pagination offset")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newExecuteCommand(provider shared.RuntimeProvider) *cobra.Command {
	var canvasID string
	var inputJSON string
	var triggerSource string
	var sessionID string
	var turnID string
	cmd := &cobra.Command{
		Use:   "execute",
		Short: "Create canvas execution",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/canvas", canvasID, "executions")
			body := map[string]any{}
			if inputJSON != "" {
				input, err := shared.ParseJSONObject(inputJSON)
				if err != nil {
					return errs.New(errs.KindUsage, "invalid --input JSON", err)
				}
				body["input"] = input
			}
			if triggerSource != "" {
				body["triggerSource"] = triggerSource
			}
			if sessionID != "" {
				body["sessionId"] = sessionID
			}
			if turnID != "" {
				body["turnId"] = turnID
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "canvas execute", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&canvasID, "id", "", "Canvas identifier")
	cmd.Flags().StringVar(&inputJSON, "input", "", "Execution input JSON object")
	cmd.Flags().StringVar(&triggerSource, "trigger-source", "", "Execution trigger source")
	cmd.Flags().StringVar(&sessionID, "session-id", "", "Session identifier")
	cmd.Flags().StringVar(&turnID, "turn-id", "", "Turn identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func parseJSONArray(raw string) ([]any, error) {
	payload := []any{}
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		return nil, err
	}
	return payload, nil
}

func parseJSONValue(raw string) (any, error) {
	var payload any
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		return nil, err
	}
	return payload, nil
}
