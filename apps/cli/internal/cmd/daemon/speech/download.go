package speech

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"

	daemonlib "github.com/kuluruvineeth/openbeam/apps/cli/internal/daemon"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func newDownloadCommand() *cobra.Command {
	var home string

	cmd := &cobra.Command{
		Use:   "download [model-ids...]",
		Short: "Download speech models",
		Args:  cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			daemonHome := daemonlib.ResolveDaemonHome(home)
			client, err := daemonlib.NewClientFromState(cmd.Context(), daemonHome)
			if err != nil {
				return errs.New(errs.KindUnknown, "cannot connect to daemon", err)
			}

			reqBody := daemonlib.SpeechDownloadRequest{ModelIDs: args}

			fmt.Fprintf(cmd.OutOrStdout(), "Downloading %d model(s)...\n", len(args))

			raw, err := client.Post(cmd.Context(), "/api/speech/download", reqBody)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to download models", err)
			}

			var resp daemonlib.SpeechDownloadResponse
			if err := json.Unmarshal(raw, &resp); err != nil {
				return errs.New(errs.KindUnknown, "invalid download response", err)
			}

			if resp.Error != "" {
				return errs.New(errs.KindUnknown, resp.Error, nil)
			}

			out := cmd.OutOrStdout()
			for _, id := range resp.DownloadedModelIDs {
				fmt.Fprintf(out, "Downloaded: %s\n", id)
			}
			fmt.Fprintf(out, "%d model(s) downloaded\n", len(resp.DownloadedModelIDs))
			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	return cmd
}
