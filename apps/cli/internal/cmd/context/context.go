package context

import (
	"net/url"
	"strings"

	"github.com/spf13/cobra"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/shared"
)

// NewCommand creates the "context" command group for the context database.
func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "context",
		Short: "Context database operations",
	}
	cmd.AddCommand(newSearchCommand(provider))
	cmd.AddCommand(newReadCommand(provider))
	cmd.AddCommand(newLsCommand(provider))
	cmd.AddCommand(newStoreCommand(provider))
	cmd.AddCommand(newRememberCommand(provider))
	cmd.AddCommand(newRecallCommand(provider))
	return cmd
}

func newSearchCommand(provider shared.RuntimeProvider) *cobra.Command {
	var queryText string
	var contextType string
	var limit int
	cmd := &cobra.Command{
		Use:   "search",
		Short: "Search the context database",
		RunE: func(cmd *cobra.Command, args []string) error {
			q := queryText
			if q == "" && len(args) > 0 {
				q = strings.Join(args, " ")
			}
			query := shared.QueryFromMap(map[string]string{
				"q":     q,
				"type":  contextType,
				"limit": shared.IntToString(limit),
			})
			return shared.GetAndRender(cmd.Context(), provider, "context search", "/api/v1/context/search", query, true)
		},
	}
	cmd.Flags().StringVarP(&queryText, "query", "q", "", "Search query text")
	cmd.Flags().StringVar(&contextType, "type", "", "Filter by context type: memory|resource|skill|tool")
	cmd.Flags().IntVar(&limit, "limit", 10, "Maximum results to return")
	return cmd
}

func newReadCommand(provider shared.RuntimeProvider) *cobra.Command {
	var uri string
	var level string
	cmd := &cobra.Command{
		Use:   "read",
		Short: "Read a context entry by URI",
		RunE: func(cmd *cobra.Command, args []string) error {
			u := uri
			if u == "" && len(args) > 0 {
				u = args[0]
			}
			query := shared.QueryFromMap(map[string]string{
				"uri":   url.QueryEscape(u),
				"level": level,
			})
			return shared.GetAndRender(cmd.Context(), provider, "context read", "/api/v1/context/entries", query, true)
		},
	}
	cmd.Flags().StringVar(&uri, "uri", "", "Context entry URI (openbeam://...)")
	cmd.Flags().StringVar(&level, "level", "", "Detail level: L0|L1|L2")
	return cmd
}

func newLsCommand(provider shared.RuntimeProvider) *cobra.Command {
	var uri string
	var limit int
	cmd := &cobra.Command{
		Use:   "ls",
		Short: "List children of a context URI",
		RunE: func(cmd *cobra.Command, args []string) error {
			u := uri
			if u == "" && len(args) > 0 {
				u = args[0]
			}
			query := shared.QueryFromMap(map[string]string{
				"parent_uri": url.QueryEscape(u),
				"limit":      shared.IntToString(limit),
			})
			return shared.GetAndRender(cmd.Context(), provider, "context ls", "/api/v1/context/entries", query, true)
		},
	}
	cmd.Flags().StringVar(&uri, "uri", "", "Parent URI to list children of")
	cmd.Flags().IntVar(&limit, "limit", 50, "Maximum entries to return")
	return cmd
}

func newStoreCommand(provider shared.RuntimeProvider) *cobra.Command {
	var contextType string
	var category string
	var uri string
	var content string
	cmd := &cobra.Command{
		Use:   "store",
		Short: "Store a context entry",
		RunE: func(cmd *cobra.Command, args []string) error {
			c := content
			if c == "" && len(args) > 0 {
				c = strings.Join(args, " ")
			}
			body := map[string]any{
				"type":     contextType,
				"category": category,
				"content":  c,
			}
			if uri != "" {
				body["uri"] = uri
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "context store", "/api/v1/context/entries", nil, body, true)
		},
	}
	cmd.Flags().StringVar(&contextType, "type", "", "Context type: memory|resource|skill|tool")
	cmd.Flags().StringVar(&category, "category", "", "Category: preferences|entities|cases|patterns")
	cmd.Flags().StringVar(&uri, "uri", "", "Explicit URI for the entry")
	cmd.Flags().StringVar(&content, "content", "", "Content to store")
	_ = cmd.MarkFlagRequired("type")
	_ = cmd.MarkFlagRequired("category")
	return cmd
}

func newRememberCommand(provider shared.RuntimeProvider) *cobra.Command {
	var content string
	cmd := &cobra.Command{
		Use:   "remember",
		Short: "Store a memory (shorthand for store --type memory --category preferences)",
		RunE: func(cmd *cobra.Command, args []string) error {
			c := content
			if c == "" && len(args) > 0 {
				c = strings.Join(args, " ")
			}
			body := map[string]any{
				"type":     "memory",
				"category": "preferences",
				"content":  c,
			}
			return shared.PostMutationAndRender(cmd.Context(), provider, "context remember", "/api/v1/context/entries", nil, body, true)
		},
	}
	cmd.Flags().StringVar(&content, "content", "", "Content to remember")
	return cmd
}

func newRecallCommand(provider shared.RuntimeProvider) *cobra.Command {
	var queryText string
	var limit int
	cmd := &cobra.Command{
		Use:   "recall",
		Short: "Recall memories (shorthand for search --type memory)",
		RunE: func(cmd *cobra.Command, args []string) error {
			q := queryText
			if q == "" && len(args) > 0 {
				q = strings.Join(args, " ")
			}
			query := shared.QueryFromMap(map[string]string{
				"q":     q,
				"type":  "memory",
				"limit": shared.IntToString(limit),
			})
			return shared.GetAndRender(cmd.Context(), provider, "context recall", "/api/v1/context/search", query, true)
		},
	}
	cmd.Flags().StringVarP(&queryText, "query", "q", "", "Recall query text")
	cmd.Flags().IntVar(&limit, "limit", 10, "Maximum results to return")
	return cmd
}
