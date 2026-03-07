package search

import (
	"strconv"

	"github.com/spf13/cobra"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/shared"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "search",
		Short: "Search indexed content",
	}
	cmd.AddCommand(newQueryCommand(provider))
	cmd.AddCommand(newRecentCommand(provider))
	cmd.AddCommand(newThreadCommand(provider))
	cmd.AddCommand(newSimilarCommand(provider))
	cmd.AddCommand(newAuthorCommand(provider))
	cmd.AddCommand(newMediaCommand(provider))
	cmd.AddCommand(newUnifiedCommand(provider))
	cmd.AddCommand(newHybridCommand(provider))
	return cmd
}

func newQueryCommand(provider shared.RuntimeProvider) *cobra.Command {
	var q string
	var connectorType []string
	var connectorID string
	var documentType []string
	var sourceType []string
	var status []string
	var priority []string
	var label []string
	var authorID string
	var sourceID string
	var fromDate int64
	var toDate int64
	var limit int
	var offset int
	var ranking string
	cmd := &cobra.Command{
		Use:   "query",
		Short: "Search documents",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMapAndLists(
				map[string]string{
					"q":            q,
					"connector_id": connectorID,
					"author_id":    authorID,
					"source_id":    sourceID,
					"limit":        shared.IntToString(limit),
					"offset":       shared.IntToString(offset),
					"ranking":      ranking,
				},
				map[string][]string{
					"connector_type": connectorType,
					"document_type":  documentType,
					"source_type":    sourceType,
					"status":         status,
					"priority":       priority,
					"label":          label,
				},
			)
			shared.SetOptionalInt64(query, "from_date", fromDate)
			shared.SetOptionalInt64(query, "to_date", toDate)
			return shared.GetAndRender(cmd.Context(), provider, "search query", "/api/v1/search", query, true)
		},
	}
	cmd.Flags().StringVarP(&q, "query", "q", "", "Search query text")
	cmd.Flags().StringSliceVar(&connectorType, "connector-type", nil, "Filter by connector type")
	cmd.Flags().StringVar(&connectorID, "connector-id", "", "Filter by connector ID")
	cmd.Flags().StringSliceVar(&documentType, "document-type", nil, "Filter by document type")
	cmd.Flags().StringSliceVar(&sourceType, "source-type", nil, "Filter by source type")
	cmd.Flags().StringSliceVar(&status, "status", nil, "Filter by status")
	cmd.Flags().StringSliceVar(&priority, "priority", nil, "Filter by priority level")
	cmd.Flags().StringSliceVar(&label, "label", nil, "Filter by label")
	cmd.Flags().StringVar(&authorID, "author-id", "", "Filter by author ID")
	cmd.Flags().StringVar(&sourceID, "source-id", "", "Filter by source ID")
	cmd.Flags().Int64Var(&fromDate, "from-date", 0, "Filter results after this timestamp")
	cmd.Flags().Int64Var(&toDate, "to-date", 0, "Filter results before this timestamp")
	cmd.Flags().IntVar(&limit, "limit", 20, "Maximum results to return")
	cmd.Flags().IntVar(&offset, "offset", 0, "Results offset for pagination")
	cmd.Flags().StringVar(&ranking, "ranking", "hybrid", "Ranking strategy")
	return cmd
}

func newRecentCommand(provider shared.RuntimeProvider) *cobra.Command {
	var hours int
	var limit int
	cmd := &cobra.Command{
		Use:   "recent",
		Short: "Get recent documents",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"hours": shared.IntToString(hours),
				"limit": shared.IntToString(limit),
			})
			return shared.GetAndRender(cmd.Context(), provider, "search recent", "/api/v1/search/recent", query, true)
		},
	}
	cmd.Flags().IntVar(&hours, "hours", 24, "Lookback window in hours")
	cmd.Flags().IntVar(&limit, "limit", 20, "Maximum results to return")
	return cmd
}

func newThreadCommand(provider shared.RuntimeProvider) *cobra.Command {
	var threadID string
	cmd := &cobra.Command{
		Use:   "thread",
		Short: "Get thread messages",
		RunE: func(cmd *cobra.Command, args []string) error {
			if threadID == "" {
				return cmd.Usage()
			}
			path := shared.Path("/api/v1/search/thread", threadID)
			return shared.GetAndRender(cmd.Context(), provider, "search thread", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&threadID, "thread-id", "", "Thread identifier")
	_ = cmd.MarkFlagRequired("thread-id")
	return cmd
}

func newSimilarCommand(provider shared.RuntimeProvider) *cobra.Command {
	var documentID string
	var limit int
	cmd := &cobra.Command{
		Use:   "similar",
		Short: "Find similar documents",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{"limit": shared.IntToString(limit)})
			path := shared.Path("/api/v1/search/similar", documentID)
			return shared.GetAndRender(cmd.Context(), provider, "search similar", path, query, true)
		},
	}
	cmd.Flags().StringVar(&documentID, "document-id", "", "Source document ID")
	cmd.Flags().IntVar(&limit, "limit", 10, "Maximum results to return")
	_ = cmd.MarkFlagRequired("document-id")
	return cmd
}

func newAuthorCommand(provider shared.RuntimeProvider) *cobra.Command {
	var authorID string
	var limit int
	cmd := &cobra.Command{
		Use:   "author",
		Short: "Get documents by author",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{"limit": shared.IntToString(limit)})
			path := shared.Path("/api/v1/search/author", authorID)
			return shared.GetAndRender(cmd.Context(), provider, "search author", path, query, true)
		},
	}
	cmd.Flags().StringVar(&authorID, "author-id", "", "Author identifier")
	cmd.Flags().IntVar(&limit, "limit", 50, "Maximum results to return")
	_ = cmd.MarkFlagRequired("author-id")
	return cmd
}

func newMediaCommand(provider shared.RuntimeProvider) *cobra.Command {
	var q string
	var connectorID string
	var sourceID string
	var mediaType string
	var fromDate int64
	var toDate int64
	var limit int
	var offset int
	var ranking string
	cmd := &cobra.Command{
		Use:   "media",
		Short: "Search media",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"q":            q,
				"connector_id": connectorID,
				"source_id":    sourceID,
				"media_type":   mediaType,
				"limit":        shared.IntToString(limit),
				"offset":       shared.IntToString(offset),
				"ranking":      ranking,
			})
			shared.SetOptionalInt64(query, "from_date", fromDate)
			shared.SetOptionalInt64(query, "to_date", toDate)
			return shared.GetAndRender(cmd.Context(), provider, "search media", "/api/v1/search/media", query, true)
		},
	}
	cmd.Flags().StringVarP(&q, "query", "q", "", "Search query text")
	cmd.Flags().StringVar(&connectorID, "connector-id", "", "Filter by connector ID")
	cmd.Flags().StringVar(&sourceID, "source-id", "", "Filter by source ID")
	cmd.Flags().StringVar(&mediaType, "media-type", "", "Filter by media type")
	cmd.Flags().Int64Var(&fromDate, "from-date", 0, "Filter results after this timestamp")
	cmd.Flags().Int64Var(&toDate, "to-date", 0, "Filter results before this timestamp")
	cmd.Flags().IntVar(&limit, "limit", 20, "Maximum results to return")
	cmd.Flags().IntVar(&offset, "offset", 0, "Results offset for pagination")
	cmd.Flags().StringVar(&ranking, "ranking", "hybrid", "Ranking strategy")
	return cmd
}

func newUnifiedCommand(provider shared.RuntimeProvider) *cobra.Command {
	var q string
	var includeDocuments bool
	var includeMedia bool
	var connectorType []string
	var connectorID string
	var documentType []string
	var sourceID string
	var fromDate int64
	var toDate int64
	var limit int
	var offset int
	var ranking string
	var mediaRanking string
	cmd := &cobra.Command{
		Use:   "unified",
		Short: "Unified document and media search",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMapAndLists(
				map[string]string{
					"q":                 q,
					"include_documents": strconv.FormatBool(includeDocuments),
					"include_media":     strconv.FormatBool(includeMedia),
					"connector_id":      connectorID,
					"source_id":         sourceID,
					"limit":             shared.IntToString(limit),
					"offset":            shared.IntToString(offset),
					"ranking":           ranking,
					"media_ranking":     mediaRanking,
				},
				map[string][]string{
					"connector_type": connectorType,
					"document_type":  documentType,
				},
			)
			shared.SetOptionalInt64(query, "from_date", fromDate)
			shared.SetOptionalInt64(query, "to_date", toDate)
			return shared.GetAndRender(cmd.Context(), provider, "search unified", "/api/v1/search/unified", query, true)
		},
	}
	cmd.Flags().StringVarP(&q, "query", "q", "", "Search query text")
	cmd.Flags().BoolVar(&includeDocuments, "include-documents", true, "Include documents in results")
	cmd.Flags().BoolVar(&includeMedia, "include-media", true, "Include media in results")
	cmd.Flags().StringSliceVar(&connectorType, "connector-type", nil, "Filter by connector type")
	cmd.Flags().StringVar(&connectorID, "connector-id", "", "Filter by connector ID")
	cmd.Flags().StringSliceVar(&documentType, "document-type", nil, "Filter by document type")
	cmd.Flags().StringVar(&sourceID, "source-id", "", "Filter by source ID")
	cmd.Flags().Int64Var(&fromDate, "from-date", 0, "Filter results after this timestamp")
	cmd.Flags().Int64Var(&toDate, "to-date", 0, "Filter results before this timestamp")
	cmd.Flags().IntVar(&limit, "limit", 20, "Maximum results to return")
	cmd.Flags().IntVar(&offset, "offset", 0, "Results offset for pagination")
	cmd.Flags().StringVar(&ranking, "ranking", "hybrid", "Document ranking strategy")
	cmd.Flags().StringVar(&mediaRanking, "media-ranking", "hybrid", "Media ranking strategy")
	return cmd
}

func newHybridCommand(provider shared.RuntimeProvider) *cobra.Command {
	var q string
	var mode string
	var rrfK int
	var weightBM25 float64
	var weightDense float64
	var weightSparse float64
	var connectorType []string
	var documentType []string
	var sourceID []string
	var fromDate int64
	var toDate int64
	var limit int
	var offset int
	cmd := &cobra.Command{
		Use:   "hybrid",
		Short: "Hybrid search with RRF",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMapAndLists(
				map[string]string{
					"q":             q,
					"mode":          mode,
					"rrf_k":         shared.IntToString(rrfK),
					"weight_bm25":   strconv.FormatFloat(weightBM25, 'g', -1, 64),
					"weight_dense":  strconv.FormatFloat(weightDense, 'g', -1, 64),
					"weight_sparse": strconv.FormatFloat(weightSparse, 'g', -1, 64),
					"limit":         shared.IntToString(limit),
					"offset":        shared.IntToString(offset),
				},
				map[string][]string{
					"connector_type": connectorType,
					"document_type":  documentType,
					"source_id":      sourceID,
				},
			)
			shared.SetOptionalInt64(query, "from_date", fromDate)
			shared.SetOptionalInt64(query, "to_date", toDate)
			return shared.GetAndRender(cmd.Context(), provider, "search hybrid", "/api/v1/search/hybrid", query, true)
		},
	}
	cmd.Flags().StringVarP(&q, "query", "q", "", "Search query text")
	cmd.Flags().StringVar(&mode, "mode", "hybrid_v2", "Hybrid search mode")
	cmd.Flags().IntVar(&rrfK, "rrf-k", 60, "RRF constant k parameter")
	cmd.Flags().Float64Var(&weightBM25, "weight-bm25", 0.4, "BM25 ranking weight")
	cmd.Flags().Float64Var(&weightDense, "weight-dense", 0.4, "Dense vector ranking weight")
	cmd.Flags().Float64Var(&weightSparse, "weight-sparse", 0.2, "Sparse vector ranking weight")
	cmd.Flags().StringSliceVar(&connectorType, "connector-type", nil, "Filter by connector type")
	cmd.Flags().StringSliceVar(&documentType, "document-type", nil, "Filter by document type")
	cmd.Flags().StringSliceVar(&sourceID, "source-id", nil, "Filter by source ID")
	cmd.Flags().Int64Var(&fromDate, "from-date", 0, "Filter results after this timestamp")
	cmd.Flags().Int64Var(&toDate, "to-date", 0, "Filter results before this timestamp")
	cmd.Flags().IntVar(&limit, "limit", 20, "Maximum results to return")
	cmd.Flags().IntVar(&offset, "offset", 0, "Results offset for pagination")
	return cmd
}
