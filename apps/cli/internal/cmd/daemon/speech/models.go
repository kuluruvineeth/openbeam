package speech

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	daemonlib "github.com/kuluruvineeth/openbeam/apps/cli/internal/daemon"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func newModelsCommand() *cobra.Command {
	var home string

	cmd := &cobra.Command{
		Use:   "models",
		Short: "List available speech models and their download status",
		RunE: func(cmd *cobra.Command, args []string) error {
			daemonHome := daemonlib.ResolveDaemonHome(home)
			client, err := daemonlib.NewClientFromState(cmd.Context(), daemonHome)
			if err != nil {
				return errs.New(errs.KindUnknown, "cannot connect to daemon", err)
			}

			raw, err := client.Get(cmd.Context(), "/api/speech/models", nil)
			if err != nil {
				return errs.New(errs.KindUnknown, "failed to list speech models", err)
			}

			var resp daemonlib.SpeechModelsResponse
			if err := json.Unmarshal(raw, &resp); err != nil {
				return errs.New(errs.KindUnknown, "invalid response", err)
			}

			out := cmd.OutOrStdout()
			if len(resp.Models) == 0 {
				fmt.Fprintln(out, "No speech models available")
				return nil
			}

			for _, m := range resp.Models {
				status := "downloaded"
				if !m.IsDownloaded {
					status = "missing"
					if len(m.MissingFiles) > 0 {
						status = fmt.Sprintf("missing (%s)", strings.Join(m.MissingFiles, ", "))
					}
				}
				fmt.Fprintf(out, "%s\t%s\t%s\n", m.ID, m.Kind, status)
			}
			return nil
		},
	}

	cmd.Flags().StringVar(&home, "home", "", "Daemon home directory")
	return cmd
}
