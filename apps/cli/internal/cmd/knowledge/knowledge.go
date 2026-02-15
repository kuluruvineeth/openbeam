package knowledge

import (
	"github.com/spf13/cobra"

	"github.com/openplane/openplane/apps/cli/internal/cmd/shared"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "knowledge",
		Short: "Knowledge graph operations",
	}
	cmd.AddCommand(newListCommand(provider))
	cmd.AddCommand(newSearchCommand(provider))
	cmd.AddCommand(newGetCommand(provider))
	cmd.AddCommand(newRelationsCommand(provider))
	cmd.AddCommand(newPanelCommand(provider))
	cmd.AddCommand(newExpertsCommand(provider))
	cmd.AddCommand(newExpertiseCommand(provider))
	return cmd
}

func newListCommand(provider shared.RuntimeProvider) *cobra.Command {
	var entityType string
	var cursor string
	var limit int
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List entities",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"type":   entityType,
				"cursor": cursor,
				"limit":  shared.IntToString(limit),
			})
			return shared.GetAndRender(cmd.Context(), provider, "knowledge list", "/api/v1/knowledge/entities", query, true)
		},
	}
	cmd.Flags().StringVar(&entityType, "type", "", "Entity type")
	cmd.Flags().StringVar(&cursor, "cursor", "", "Pagination cursor")
	cmd.Flags().IntVar(&limit, "limit", 20, "Page size")
	return cmd
}

func newSearchCommand(provider shared.RuntimeProvider) *cobra.Command {
	var queryText string
	var entityType string
	var limit int
	cmd := &cobra.Command{
		Use:   "search",
		Short: "Search entities",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"query": queryText,
				"type":  entityType,
				"limit": shared.IntToString(limit),
			})
			return shared.GetAndRender(cmd.Context(), provider, "knowledge search", "/api/v1/knowledge/entities/search", query, true)
		},
	}
	cmd.Flags().StringVarP(&queryText, "query", "q", "", "Search query")
	cmd.Flags().StringVar(&entityType, "type", "", "Entity type")
	cmd.Flags().IntVar(&limit, "limit", 10, "Result size")
	_ = cmd.MarkFlagRequired("query")
	return cmd
}

func newGetCommand(provider shared.RuntimeProvider) *cobra.Command {
	var id string
	cmd := &cobra.Command{
		Use:   "get",
		Short: "Get entity",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/knowledge/entities", id)
			return shared.GetAndRender(cmd.Context(), provider, "knowledge get", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&id, "id", "", "Entity identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newRelationsCommand(provider shared.RuntimeProvider) *cobra.Command {
	var id string
	var direction string
	cmd := &cobra.Command{
		Use:   "relations",
		Short: "Get entity relations",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/knowledge/entities", id, "relations")
			query := shared.QueryFromMap(map[string]string{"direction": direction})
			return shared.GetAndRender(cmd.Context(), provider, "knowledge relations", path, query, true)
		},
	}
	cmd.Flags().StringVar(&id, "id", "", "Entity identifier")
	cmd.Flags().StringVar(&direction, "direction", "both", "Relation direction")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newPanelCommand(provider shared.RuntimeProvider) *cobra.Command {
	var id string
	cmd := &cobra.Command{
		Use:   "panel",
		Short: "Get knowledge panel",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/knowledge/entities", id, "panel")
			return shared.GetAndRender(cmd.Context(), provider, "knowledge panel", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&id, "id", "", "Entity identifier")
	_ = cmd.MarkFlagRequired("id")
	return cmd
}

func newExpertsCommand(provider shared.RuntimeProvider) *cobra.Command {
	var topicID string
	var limit int
	cmd := &cobra.Command{
		Use:   "experts",
		Short: "Get topic experts",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/knowledge/topics", topicID, "experts")
			query := shared.QueryFromMap(map[string]string{"limit": shared.IntToString(limit)})
			return shared.GetAndRender(cmd.Context(), provider, "knowledge experts", path, query, true)
		},
	}
	cmd.Flags().StringVar(&topicID, "topic-id", "", "Topic identifier")
	cmd.Flags().IntVar(&limit, "limit", 10, "Result size")
	_ = cmd.MarkFlagRequired("topic-id")
	return cmd
}

func newExpertiseCommand(provider shared.RuntimeProvider) *cobra.Command {
	var personID string
	var limit int
	cmd := &cobra.Command{
		Use:   "expertise",
		Short: "Get person expertise",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/knowledge/people", personID, "expertise")
			query := shared.QueryFromMap(map[string]string{"limit": shared.IntToString(limit)})
			return shared.GetAndRender(cmd.Context(), provider, "knowledge expertise", path, query, true)
		},
	}
	cmd.Flags().StringVar(&personID, "person-id", "", "Person identifier")
	cmd.Flags().IntVar(&limit, "limit", 10, "Result size")
	_ = cmd.MarkFlagRequired("person-id")
	return cmd
}
