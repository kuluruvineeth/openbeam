package provider

import (
	"fmt"

	"github.com/spf13/cobra"
)

type providerInfo struct {
	ID          string
	Label       string
	Description string
}

var knownProviders = []providerInfo{
	{ID: "claude", Label: "Claude", Description: "Anthropic Claude models"},
	{ID: "openai", Label: "OpenAI", Description: "OpenAI GPT models"},
	{ID: "opencode", Label: "OpenCode", Description: "Open-source code models"},
}

func newLsCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "ls",
		Short: "List available AI providers",
		RunE: func(cmd *cobra.Command, args []string) error {
			out := cmd.OutOrStdout()
			for _, p := range knownProviders {
				fmt.Fprintf(out, "%s\t%s\t%s\n", p.ID, p.Label, p.Description)
			}
			return nil
		},
	}
	return cmd
}
