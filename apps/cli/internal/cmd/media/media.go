package media

import (
	"github.com/spf13/cobra"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/shared"
)

func NewCommand(provider shared.RuntimeProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "media",
		Short: "Media deep operations",
	}
	cmd.AddCommand(newChaptersCommand(provider))
	cmd.AddCommand(newHighlightsCommand(provider))
	cmd.AddCommand(newTranscriptCommand(provider))
	cmd.AddCommand(newSummaryCommand(provider))
	cmd.AddCommand(newMetadataCommand(provider))
	cmd.AddCommand(newRegenerateCommand(provider))
	cmd.AddCommand(newAskCommand(provider))
	return cmd
}

func newChaptersCommand(provider shared.RuntimeProvider) *cobra.Command {
	var vespaID string
	var forceRefresh bool
	cmd := &cobra.Command{
		Use:   "chapters",
		Short: "Get chapters",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/media", vespaID, "chapters")
			query := shared.QueryFromMap(map[string]string{"forceRefresh": boolToString(forceRefresh)})
			return shared.GetAndRender(cmd.Context(), provider, "media chapters", path, query, true)
		},
	}
	cmd.Flags().StringVar(&vespaID, "vespa-id", "", "Vespa document identifier")
	cmd.Flags().BoolVar(&forceRefresh, "force-refresh", false, "Refresh generated content")
	_ = cmd.MarkFlagRequired("vespa-id")
	return cmd
}

func newHighlightsCommand(provider shared.RuntimeProvider) *cobra.Command {
	var vespaID string
	var forceRefresh bool
	cmd := &cobra.Command{
		Use:   "highlights",
		Short: "Get highlights",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/media", vespaID, "highlights")
			query := shared.QueryFromMap(map[string]string{"forceRefresh": boolToString(forceRefresh)})
			return shared.GetAndRender(cmd.Context(), provider, "media highlights", path, query, true)
		},
	}
	cmd.Flags().StringVar(&vespaID, "vespa-id", "", "Vespa document identifier")
	cmd.Flags().BoolVar(&forceRefresh, "force-refresh", false, "Refresh generated content")
	_ = cmd.MarkFlagRequired("vespa-id")
	return cmd
}

func newTranscriptCommand(provider shared.RuntimeProvider) *cobra.Command {
	var vespaID string
	var forceRefresh bool
	cmd := &cobra.Command{
		Use:   "transcript",
		Short: "Get transcript",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/media", vespaID, "transcript")
			query := shared.QueryFromMap(map[string]string{"forceRefresh": boolToString(forceRefresh)})
			return shared.GetAndRender(cmd.Context(), provider, "media transcript", path, query, true)
		},
	}
	cmd.Flags().StringVar(&vespaID, "vespa-id", "", "Vespa document identifier")
	cmd.Flags().BoolVar(&forceRefresh, "force-refresh", false, "Refresh generated content")
	_ = cmd.MarkFlagRequired("vespa-id")
	return cmd
}

func newSummaryCommand(provider shared.RuntimeProvider) *cobra.Command {
	var vespaID string
	var forceRefresh bool
	cmd := &cobra.Command{
		Use:   "summary",
		Short: "Get summary",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/media", vespaID, "summary")
			query := shared.QueryFromMap(map[string]string{"forceRefresh": boolToString(forceRefresh)})
			return shared.GetAndRender(cmd.Context(), provider, "media summary", path, query, true)
		},
	}
	cmd.Flags().StringVar(&vespaID, "vespa-id", "", "Vespa document identifier")
	cmd.Flags().BoolVar(&forceRefresh, "force-refresh", false, "Refresh generated content")
	_ = cmd.MarkFlagRequired("vespa-id")
	return cmd
}

func newMetadataCommand(provider shared.RuntimeProvider) *cobra.Command {
	var vespaID string
	cmd := &cobra.Command{
		Use:   "metadata",
		Short: "Get metadata",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/media", vespaID, "metadata")
			return shared.GetAndRender(cmd.Context(), provider, "media metadata", path, nil, true)
		},
	}
	cmd.Flags().StringVar(&vespaID, "vespa-id", "", "Vespa document identifier")
	_ = cmd.MarkFlagRequired("vespa-id")
	return cmd
}

func newRegenerateCommand(provider shared.RuntimeProvider) *cobra.Command {
	var vespaID string
	var contentTypes []string
	cmd := &cobra.Command{
		Use:   "regenerate",
		Short: "Regenerate derived content",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/media", vespaID, "regenerate")
			body := map[string]any{"contentTypes": contentTypes}
			return shared.PostMutationAndRender(cmd.Context(), provider, "media regenerate", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&vespaID, "vespa-id", "", "Vespa document identifier")
	cmd.Flags().StringSliceVar(&contentTypes, "content-type", nil, "Content types to regenerate")
	_ = cmd.MarkFlagRequired("vespa-id")
	_ = cmd.MarkFlagRequired("content-type")
	return cmd
}

func newAskCommand(provider shared.RuntimeProvider) *cobra.Command {
	var mediaID string
	var question string
	cmd := &cobra.Command{
		Use:   "ask",
		Short: "Ask about media",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := shared.Path("/api/v1/media", mediaID, "ask")
			body := map[string]any{"question": question}
			return shared.PostAndRender(cmd.Context(), provider, "media ask", path, nil, body, true)
		},
	}
	cmd.Flags().StringVar(&mediaID, "media-id", "", "Media identifier")
	cmd.Flags().StringVar(&question, "question", "", "Question text")
	_ = cmd.MarkFlagRequired("media-id")
	_ = cmd.MarkFlagRequired("question")
	return cmd
}

func boolToString(value bool) string {
	if value {
		return "true"
	}
	return "false"
}
