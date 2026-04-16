package boot

import (
	"context"
	"io"

	"github.com/spf13/cobra"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/agent"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/analytics"
	authcmd "github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/auth"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/backgroundagents"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/canvas"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/computer"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/completion"
	configcmd "github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/config"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/control"
	daemoncmd "github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/daemon"
	contextcmd "github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/context"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/connectors"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/integrations"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/knowledge"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/mcp"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/media"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/permissions"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/plugin"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/rag"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/research"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/search"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/teams"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/version"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/exitcode"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/runtime"
)

type rootFlags struct {
	Profile        string
	Host           string
	Team           string
	Output         string
	JQ             string
	Template       string
	Raw            bool
	Color          string
	NoColor        bool
	Timeout        string
	Trace          bool
	NonInteractive bool
	Yes            bool
	Debug          bool
}

func NewRootCommand(ctx context.Context, in io.Reader, out io.Writer, errOut io.Writer) (*cobra.Command, error) {
	flags := rootFlags{}
	outFD := runtime.InvalidFD
	if file, ok := out.(interface{ Fd() uintptr }); ok {
		outFD = file.Fd()
	}
	builder := &runtime.Builder{
		Streams: runtime.Streams{In: in, Out: out, Err: errOut, OutFD: outFD},
	}

	buildRuntime := func() (*runtime.Runtime, error) {
		return builder.Build(runtime.GlobalOptions{
			Profile:        flags.Profile,
			Host:           flags.Host,
			Team:           flags.Team,
			Output:         flags.Output,
			JQ:             flags.JQ,
			Template:       flags.Template,
			Raw:            flags.Raw,
			Color:          flags.Color,
			NoColor:        flags.NoColor,
			Timeout:        flags.Timeout,
			Trace:          flags.Trace,
			NonInteractive: flags.NonInteractive,
			Yes:            flags.Yes,
			Debug:          flags.Debug,
		})
	}

	root := &cobra.Command{
		Use:           "openbeam",
		Short:         "OpenBeam CLI",
		SilenceErrors: true,
		SilenceUsage:  true,
	}
	root.SetIn(in)
	root.SetOut(out)
	root.SetErr(errOut)
	root.SetContext(ctx)

	root.PersistentFlags().StringVar(&flags.Profile, "profile", "", "Profile name")
	root.PersistentFlags().StringVar(&flags.Host, "host", "", "API base URL")
	root.PersistentFlags().StringVar(&flags.Team, "team", "", "Team identifier")
	root.PersistentFlags().StringVar(&flags.Output, "output", "", "Output format: table|json|yaml|ndjson")
	root.PersistentFlags().StringVar(&flags.JQ, "jq", "", "Filter JSON output with jq expression")
	root.PersistentFlags().StringVar(&flags.Template, "template", "", "Format output with Go template")
	root.PersistentFlags().BoolVar(&flags.Raw, "raw", false, "Emit raw response body")
	root.PersistentFlags().StringVar(&flags.Color, "color", "", "Color mode: auto|always|never")
	root.PersistentFlags().BoolVar(&flags.NoColor, "no-color", false, "Disable color output")
	root.PersistentFlags().StringVar(&flags.Timeout, "timeout", "", "Request timeout (for example: 30s, 2m)")
	root.PersistentFlags().BoolVar(&flags.Trace, "trace", false, "Trace HTTP requests")
	root.PersistentFlags().BoolVar(&flags.NonInteractive, "non-interactive", false, "Disable interactive prompts")
	root.PersistentFlags().BoolVarP(&flags.Yes, "yes", "y", false, "Assume yes for confirmations")
	root.PersistentFlags().BoolVar(&flags.Debug, "debug", false, "Enable debug behavior")

	root.AddGroup(
		&cobra.Group{ID: "core", Title: "Core Commands"},
		&cobra.Group{ID: "agent", Title: "Agent and Platform Commands"},
		&cobra.Group{ID: "ext", Title: "Extensions"},
	)

	authCommand := authcmd.NewCommand(buildRuntime)
	searchCommand := search.NewCommand(buildRuntime)
	connectorsCommand := connectors.NewCommand(buildRuntime)
	analyticsCommand := analytics.NewCommand(buildRuntime)
	integrationsCommand := integrations.NewCommand(buildRuntime)
	configCommand := configcmd.NewCommand(buildRuntime)
	completionCommand := completion.NewCommand(root)
	versionCommand := version.NewCommand()
	teamsCommand := teams.NewCommand(buildRuntime)

	daemonCommand := daemoncmd.NewCommand(buildRuntime)

	agentCommand := agent.NewCommand(buildRuntime)
	backgroundAgentsCommand := backgroundagents.NewCommand(buildRuntime)
	canvasCommand := canvas.NewCommand(buildRuntime)
	computerCommand := computer.NewCommand(buildRuntime)
	ragCommand := rag.NewCommand(buildRuntime)
	researchCommand := research.NewCommand(buildRuntime)
	knowledgeCommand := knowledge.NewCommand(buildRuntime)
	permissionsCommand := permissions.NewCommand(buildRuntime)
	mediaCommand := media.NewCommand(buildRuntime)
	mcpCommand := mcp.NewCommand(buildRuntime)
	controlCommand := control.NewCommand(buildRuntime)
	contextCommand := contextcmd.NewCommand(buildRuntime)

	pluginCommand := plugin.NewCommand(buildRuntime)

	authCommand.GroupID = "core"
	searchCommand.GroupID = "core"
	connectorsCommand.GroupID = "core"
	analyticsCommand.GroupID = "core"
	integrationsCommand.GroupID = "core"
	configCommand.GroupID = "core"
	completionCommand.GroupID = "core"
	versionCommand.GroupID = "core"
	teamsCommand.GroupID = "core"

	daemonCommand.GroupID = "core"

	agentCommand.GroupID = "agent"
	backgroundAgentsCommand.GroupID = "agent"
	canvasCommand.GroupID = "agent"
	computerCommand.GroupID = "agent"
	ragCommand.GroupID = "agent"
	researchCommand.GroupID = "agent"
	knowledgeCommand.GroupID = "agent"
	permissionsCommand.GroupID = "agent"
	mediaCommand.GroupID = "agent"
	mcpCommand.GroupID = "agent"
	controlCommand.GroupID = "agent"
	contextCommand.GroupID = "agent"

	pluginCommand.GroupID = "ext"

	root.AddCommand(authCommand)
	root.AddCommand(searchCommand)
	root.AddCommand(connectorsCommand)
	root.AddCommand(analyticsCommand)
	root.AddCommand(integrationsCommand)
	root.AddCommand(configCommand)
	root.AddCommand(completionCommand)
	root.AddCommand(versionCommand)
	root.AddCommand(teamsCommand)
	root.AddCommand(daemonCommand)
	root.AddCommand(agentCommand)
	root.AddCommand(backgroundAgentsCommand)
	root.AddCommand(canvasCommand)
	root.AddCommand(computerCommand)
	root.AddCommand(ragCommand)
	root.AddCommand(researchCommand)
	root.AddCommand(knowledgeCommand)
	root.AddCommand(permissionsCommand)
	root.AddCommand(mediaCommand)
	root.AddCommand(mcpCommand)
	root.AddCommand(controlCommand)
	root.AddCommand(contextCommand)
	root.AddCommand(pluginCommand)

	return root, nil
}

func MapErrorToExitCode(err error) exitcode.Code {
	return errs.ExitCode(err)
}
