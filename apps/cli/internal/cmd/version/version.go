package version

import (
	"fmt"
	"runtime"

	"github.com/spf13/cobra"
)

var (
	Version = "0.1.0"
	Commit  = "dev"
	Date    = "unknown"
)

func NewCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "version",
		Short: "Print version",
		RunE: func(cmd *cobra.Command, args []string) error {
			_, err := fmt.Fprintf(
				cmd.OutOrStdout(),
				"%s (commit=%s date=%s go=%s %s/%s)\n",
				Version,
				Commit,
				Date,
				runtime.Version(),
				runtime.GOOS,
				runtime.GOARCH,
			)
			return err
		},
	}
	return cmd
}
