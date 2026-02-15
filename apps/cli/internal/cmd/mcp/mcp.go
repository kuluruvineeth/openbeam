package mcp

import (
	"context"
	"encoding/json"
	"net/url"

	"github.com/spf13/cobra"

	"github.com/openplane/openplane/apps/cli/internal/api"
	"github.com/openplane/openplane/apps/cli/internal/cmd/shared"
	"github.com/openplane/openplane/apps/cli/internal/errs"
	mcpcore "github.com/openplane/openplane/apps/cli/internal/mcp"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "mcp",
		Short: "MCP APIs",
	}
	cmd.AddCommand(newToolsCommand(provider))
	cmd.AddCommand(newResourcesCommand(provider))
	cmd.AddCommand(newPromptsCommand(provider))
	cmd.AddCommand(newServeCommand(provider))
	return cmd
}

func newToolsCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{Use: "tools", Short: "MCP tools"}
	cmd.AddCommand(&cobra.Command{
		Use: "list",
		RunE: func(cmd *cobra.Command, args []string) error {
			return shared.GetAndRender(cmd.Context(), provider, "mcp tools list", "/api/mcp/tools", nil, true)
		},
	})
	callCmd := &cobra.Command{
		Use: "call",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runToolCall(cmd, provider)
		},
	}
	callCmd.Flags().String("name", "", "Tool name to call")
	callCmd.Flags().String("args", "{}", "Tool arguments as JSON")
	_ = callCmd.MarkFlagRequired("name")
	cmd.AddCommand(callCmd)
	return cmd
}

func newResourcesCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{Use: "resources", Short: "MCP resources"}
	cmd.AddCommand(&cobra.Command{
		Use: "list",
		RunE: func(cmd *cobra.Command, args []string) error {
			return shared.GetAndRender(cmd.Context(), provider, "mcp resources list", "/api/mcp/resources", nil, true)
		},
	})
	readCmd := &cobra.Command{
		Use: "read",
		RunE: func(cmd *cobra.Command, args []string) error {
			uri, _ := cmd.Flags().GetString("uri")
			path := shared.Path("/api/mcp/resources", uri)
			return shared.GetAndRender(cmd.Context(), provider, "mcp resources read", path, nil, true)
		},
	}
	readCmd.Flags().String("uri", "", "Resource URI to read")
	_ = readCmd.MarkFlagRequired("uri")
	cmd.AddCommand(readCmd)
	return cmd
}

func newPromptsCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{Use: "prompts", Short: "MCP prompts"}
	cmd.AddCommand(&cobra.Command{
		Use: "list",
		RunE: func(cmd *cobra.Command, args []string) error {
			return shared.GetAndRender(cmd.Context(), provider, "mcp prompts list", "/api/mcp/prompts", nil, true)
		},
	})
	getCmd := &cobra.Command{
		Use: "get",
		RunE: func(cmd *cobra.Command, args []string) error {
			name, _ := cmd.Flags().GetString("name")
			rawArgs, _ := cmd.Flags().GetString("args")
			payload, err := decodeArgs(rawArgs)
			if err != nil {
				return errs.New(errs.KindUsage, "invalid --args JSON", err)
			}
			query := url.Values{}
			if len(payload) > 0 {
				encoded, _ := json.Marshal(payload)
				query.Set("args", string(encoded))
			}
			path := shared.Path("/api/mcp/prompts", name)
			return shared.GetAndRender(cmd.Context(), provider, "mcp prompts get", path, query, true)
		},
	}
	getCmd.Flags().String("name", "", "Prompt name to retrieve")
	getCmd.Flags().String("args", "{}", "Prompt arguments as JSON")
	_ = getCmd.MarkFlagRequired("name")
	cmd.AddCommand(getCmd)
	return cmd
}

func runToolCall(cmd *cobra.Command, provider shared.RuntimeProvider) error {
	name, _ := cmd.Flags().GetString("name")
	rawArgs, _ := cmd.Flags().GetString("args")
	payload, err := decodeArgs(rawArgs)
	if err != nil {
		return errs.New(errs.KindUsage, "invalid --args JSON", err)
	}
	body := map[string]any{"arguments": payload}
	path := shared.Path("/api/mcp/tools", name, "call")
	return shared.PostAndRender(cmd.Context(), provider, "mcp tools call", path, nil, body, true)
}

func newServeCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "serve",
		Short: "Serve MCP over stdin/stdout JSON-RPC",
		RunE: func(cmd *cobra.Command, args []string) error {
			rt, err := provider()
			if err != nil {
				return err
			}
			if err := rt.RequireAPIKey(); err != nil {
				return err
			}
			adapter := mcpcore.NewHTTPAdapter(
				func(ctx context.Context, path string, query url.Values) (any, error) {
					result, _, err := rt.Get(ctx, path, query)
					return result, err
				},
				func(ctx context.Context, path string, query url.Values, body any) (any, error) {
					result, _, err := rt.Post(ctx, path, query, body)
					return result, err
				},
			)
			server := &mcpcore.Server{
				In:      rt.Streams.In,
				Out:     rt.Streams.Out,
				Handler: adapter,
			}
			return server.Serve(cmd.Context())
		},
	}
	return cmd
}

func decodeArgs(raw string) (map[string]any, error) {
	encoded, err := api.EncodeArgsJSON(raw)
	if err != nil {
		return nil, err
	}
	value := map[string]any{}
	if err := json.Unmarshal([]byte(encoded), &value); err != nil {
		return nil, err
	}
	return value, nil
}
