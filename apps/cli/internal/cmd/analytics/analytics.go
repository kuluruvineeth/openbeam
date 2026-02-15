package analytics

import (
	"github.com/spf13/cobra"

	"github.com/openplane/openplane/apps/cli/internal/cmd/shared"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "analytics",
		Short: "Analytics APIs",
	}
	cmd.AddCommand(newCostBreakdownCommand(provider))
	cmd.AddCommand(newUsageTrendCommand(provider))
	cmd.AddCommand(newTopCostDriversCommand(provider))
	cmd.AddCommand(newSpreadsheetsCommand(provider))
	return cmd
}

func newCostBreakdownCommand(provider shared.RuntimeProvider) *cobra.Command {
	var startDate string
	var endDate string
	var groupBy []string
	cmd := &cobra.Command{
		Use:   "cost-breakdown",
		Short: "Get cost breakdown",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMapAndLists(map[string]string{
				"start_date": startDate,
				"end_date":   endDate,
			}, map[string][]string{
				"group_by": groupBy,
			})
			return shared.GetAndRender(cmd.Context(), provider, "analytics cost-breakdown", "/api/v1/analytics/cost-breakdown", query, true)
		},
	}
	cmd.Flags().StringVar(&startDate, "start-date", "", "Start date for range (ISO 8601)")
	cmd.Flags().StringVar(&endDate, "end-date", "", "End date for range (ISO 8601)")
	cmd.Flags().StringSliceVar(&groupBy, "group-by", nil, "Group results by field")
	_ = cmd.MarkFlagRequired("start-date")
	_ = cmd.MarkFlagRequired("end-date")
	return cmd
}

func newUsageTrendCommand(provider shared.RuntimeProvider) *cobra.Command {
	var startDate string
	var endDate string
	var granularity string
	cmd := &cobra.Command{
		Use:   "usage-trend",
		Short: "Get usage trend",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"start_date":  startDate,
				"end_date":    endDate,
				"granularity": granularity,
			})
			return shared.GetAndRender(cmd.Context(), provider, "analytics usage-trend", "/api/v1/analytics/usage-trend", query, true)
		},
	}
	cmd.Flags().StringVar(&startDate, "start-date", "", "Start date for range (ISO 8601)")
	cmd.Flags().StringVar(&endDate, "end-date", "", "End date for range (ISO 8601)")
	cmd.Flags().StringVar(&granularity, "granularity", "day", "Time granularity (hour, day, week, month)")
	_ = cmd.MarkFlagRequired("start-date")
	_ = cmd.MarkFlagRequired("end-date")
	return cmd
}

func newTopCostDriversCommand(provider shared.RuntimeProvider) *cobra.Command {
	var startDate string
	var endDate string
	var dimension string
	var limit int
	cmd := &cobra.Command{
		Use:   "top-cost-drivers",
		Short: "Get top cost drivers",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{
				"start_date": startDate,
				"end_date":   endDate,
				"dimension":  dimension,
				"limit":      shared.IntToString(limit),
			})
			return shared.GetAndRender(cmd.Context(), provider, "analytics top-cost-drivers", "/api/v1/analytics/top-cost-drivers", query, true)
		},
	}
	cmd.Flags().StringVar(&startDate, "start-date", "", "Start date for range (ISO 8601)")
	cmd.Flags().StringVar(&endDate, "end-date", "", "End date for range (ISO 8601)")
	cmd.Flags().StringVar(&dimension, "dimension", "model", "Dimension to query")
	cmd.Flags().IntVar(&limit, "limit", 10, "Maximum results to return")
	_ = cmd.MarkFlagRequired("start-date")
	_ = cmd.MarkFlagRequired("end-date")
	return cmd
}

func newSpreadsheetsCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "spreadsheets",
		Short: "Spreadsheet analytics",
	}
	cmd.AddCommand(newSpreadsheetsListCommand(provider))
	cmd.AddCommand(newSpreadsheetsSchemaCommand(provider))
	cmd.AddCommand(newSpreadsheetsGenerateSQLCommand(provider))
	cmd.AddCommand(newSpreadsheetsQueryCommand(provider))
	return cmd
}

func newSpreadsheetsListCommand(provider shared.RuntimeProvider) *cobra.Command {
	var limit int
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List indexed spreadsheets",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{"limit": shared.IntToString(limit)})
			return shared.GetAndRender(cmd.Context(), provider, "analytics spreadsheets list", "/api/v1/analytics/spreadsheets", query, true)
		},
	}
	cmd.Flags().IntVar(&limit, "limit", 20, "Maximum results to return")
	return cmd
}

func newSpreadsheetsSchemaCommand(provider shared.RuntimeProvider) *cobra.Command {
	var documentID string
	var sheet string
	cmd := &cobra.Command{
		Use:   "schema",
		Short: "Get spreadsheet schema",
		RunE: func(cmd *cobra.Command, args []string) error {
			query := shared.QueryFromMap(map[string]string{"sheet": sheet})
			path := shared.Path("/api/v1/analytics/spreadsheets", documentID, "schema")
			return shared.GetAndRender(cmd.Context(), provider, "analytics spreadsheets schema", path, query, true)
		},
	}
	cmd.Flags().StringVar(&documentID, "document-id", "", "Spreadsheet document ID")
	cmd.Flags().StringVar(&sheet, "sheet", "", "Sheet name")
	_ = cmd.MarkFlagRequired("document-id")
	return cmd
}

func newSpreadsheetsGenerateSQLCommand(provider shared.RuntimeProvider) *cobra.Command {
	var documentID string
	var question string
	cmd := &cobra.Command{
		Use:   "generate-sql",
		Short: "Generate SQL from natural language",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/analytics/spreadsheets", documentID, "generate-sql")
			body := map[string]string{"question": question}
			return shared.PostAndRender(cmd.Context(), provider, "analytics spreadsheets generate-sql", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&documentID, "document-id", "", "Spreadsheet document ID")
	cmd.Flags().StringVar(&question, "question", "", "Natural language question")
	_ = cmd.MarkFlagRequired("document-id")
	_ = cmd.MarkFlagRequired("question")
	return cmd
}

func newSpreadsheetsQueryCommand(provider shared.RuntimeProvider) *cobra.Command {
	var documentID string
	var sql string
	var viewName string
	var maxRows int
	var timeoutMS int
	cmd := &cobra.Command{
		Use:   "query",
		Short: "Execute SQL query",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/analytics/spreadsheets", documentID, "query")
			body := map[string]any{
				"sql":        sql,
				"view_name":  viewName,
				"max_rows":   maxRows,
				"timeout_ms": timeoutMS,
			}
			return shared.PostAndRender(cmd.Context(), provider, "analytics spreadsheets query", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&documentID, "document-id", "", "Spreadsheet document ID")
	cmd.Flags().StringVar(&sql, "sql", "", "SQL query to execute")
	cmd.Flags().StringVar(&viewName, "view-name", "", "Analytics view name")
	cmd.Flags().IntVar(&maxRows, "max-rows", 1000, "Maximum rows to return")
	cmd.Flags().IntVar(&timeoutMS, "timeout-ms", 10000, "Query timeout in milliseconds")
	_ = cmd.MarkFlagRequired("document-id")
	_ = cmd.MarkFlagRequired("sql")
	_ = cmd.MarkFlagRequired("view-name")
	return cmd
}
