package rag

import (
	"encoding/json"
	"net/url"

	"github.com/spf13/cobra"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/api"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/shared"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/output"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "rag",
		Short: "RAG workflows",
	}
	cmd.AddCommand(newAskCommand(provider))
	cmd.AddCommand(newStreamCommand(provider))
	cmd.AddCommand(newConversationsCommand(provider))
	return cmd
}

func newAskCommand(provider shared.RuntimeProvider) *cobra.Command {
	var query string
	var conversationID string
	var modelID string
	var temperature float64
	var includeMedia bool
	var sourceID string
	cmd := &cobra.Command{
		Use:   "ask",
		Short: "Ask a RAG question",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{
				"query":        query,
				"includeMedia": includeMedia,
			}
			if conversationID != "" {
				body["conversationId"] = conversationID
			}
			if modelID != "" {
				body["modelId"] = modelID
			}
			if sourceID != "" {
				body["sourceId"] = sourceID
			}
			if cmd.Flags().Changed("temperature") {
				body["temperature"] = temperature
			}
			return shared.PostAndRender(cmd.Context(), provider, "rag ask", "/api/v1/rag/ask", nil, body, true)
		},
	}
	cmd.Flags().StringVarP(&query, "query", "q", "", "Question text")
	cmd.Flags().StringVar(&conversationID, "conversation-id", "", "Conversation identifier")
	cmd.Flags().StringVar(&modelID, "model-id", "", "Model identifier")
	cmd.Flags().Float64Var(&temperature, "temperature", 0, "Sampling temperature")
	cmd.Flags().BoolVar(&includeMedia, "include-media", true, "Include media sources")
	cmd.Flags().StringVar(&sourceID, "source-id", "", "Restrict to source")
	_ = cmd.MarkFlagRequired("query")
	return cmd
}

func newStreamCommand(provider shared.RuntimeProvider) *cobra.Command {
	var query string
	var conversationID string
	var modelID string
	var temperature float64
	var includeMedia bool
	var sourceID string
	cmd := &cobra.Command{
		Use:   "stream",
		Short: "Stream RAG response",
		RunE: func(cmd *cobra.Command, args []string) error {
			rt, err := provider()
			if err != nil {
				return err
			}
			if err := rt.RequireAPIKey(); err != nil {
				return err
			}

			body := map[string]any{
				"query":        query,
				"includeMedia": includeMedia,
			}
			if conversationID != "" {
				body["conversationId"] = conversationID
			}
			if modelID != "" {
				body["modelId"] = modelID
			}
			if sourceID != "" {
				body["sourceId"] = sourceID
			}
			if cmd.Flags().Changed("temperature") {
				body["temperature"] = temperature
			}

			return rt.Stream(cmd.Context(), "/api/v1/rag/stream", url.Values{}, body, func(event api.SSEEvent) error {
				if event.Data == "" {
					return nil
				}
				if rt.Output.Format == output.FormatJSON || rt.Output.Format == output.FormatNDJSON {
					_, writeErr := rt.Streams.Out.Write([]byte(event.Data + "\n"))
					return writeErr
				}
				var value any
				if err := json.Unmarshal([]byte(event.Data), &value); err != nil {
					_, writeErr := rt.Streams.Out.Write([]byte(event.Data + "\n"))
					return writeErr
				}
				return output.Render(rt.Streams.Out, value, output.Options{Format: rt.Output.Format})
			})
		},
	}
	cmd.Flags().StringVarP(&query, "query", "q", "", "Question text")
	cmd.Flags().StringVar(&conversationID, "conversation-id", "", "Conversation identifier")
	cmd.Flags().StringVar(&modelID, "model-id", "", "Model identifier")
	cmd.Flags().Float64Var(&temperature, "temperature", 0, "Sampling temperature")
	cmd.Flags().BoolVar(&includeMedia, "include-media", true, "Include media sources")
	cmd.Flags().StringVar(&sourceID, "source-id", "", "Restrict to source")
	_ = cmd.MarkFlagRequired("query")
	return cmd
}

func newConversationsCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "conversations",
		Short: "Conversation lifecycle",
	}
	cmd.AddCommand(newConversationsCreateCommand(provider))
	cmd.AddCommand(newConversationsListCommand(provider))
	cmd.AddCommand(newConversationsGetCommand(provider))
	cmd.AddCommand(newConversationsDeleteCommand(provider))
	return cmd
}

func newConversationsCreateCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create",
		Short: "Create conversation",
		RunE: func(cmd *cobra.Command, args []string) error {
			return shared.PostMutationAndRender(cmd.Context(), provider, "rag conversations create", "/api/v1/rag/conversations", nil, map[string]any{}, true)
		},
	}
	return cmd
}

func newConversationsListCommand(provider shared.RuntimeProvider) *cobra.Command {
	var status string
	var limit int
	var offset int
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List conversations",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"status": status,
				"limit":  shared.IntToString(limit),
				"offset": shared.IntToString(offset),
			})
			return shared.GetAndRender(cmd.Context(), provider, "rag conversations list", "/api/v1/rag/conversations", query, true)
		},
	}
	cmd.Flags().StringVar(&status, "status", "active", "Conversation status")
	cmd.Flags().IntVar(&limit, "limit", 20, "Page size")
	cmd.Flags().IntVar(&offset, "offset", 0, "Pagination offset")
	return cmd
}

func newConversationsGetCommand(provider shared.RuntimeProvider) *cobra.Command {
	var conversationID string
	cmd := &cobra.Command{
		Use:   "get",
		Short: "Get conversation",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/rag/conversations", conversationID)
			return shared.GetAndRender(cmd.Context(), provider, "rag conversations get", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&conversationID, "id", "", "Conversation identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newConversationsDeleteCommand(provider shared.RuntimeProvider) *cobra.Command {
	var conversationID string
	cmd := &cobra.Command{
		Use:   "delete",
		Short: "Delete conversation",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/rag/conversations", conversationID)
			return shared.DeleteMutationAndRender(cmd.Context(), provider, "rag conversations delete", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&conversationID, "id", "", "Conversation identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}
