package runtime

import (
	"io"

	"github.com/openplane/openplane/apps/cli/internal/api"
	"github.com/openplane/openplane/apps/cli/internal/auth"
	"github.com/openplane/openplane/apps/cli/internal/config"
	"github.com/openplane/openplane/apps/cli/internal/output"
)

const InvalidFD = ^uintptr(0)

type Streams struct {
	In    io.Reader
	Out   io.Writer
	Err   io.Writer
	OutFD uintptr
}

type GlobalOptions struct {
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

type Runtime struct {
	Streams     Streams
	Options     GlobalOptions
	ConfigStore *config.Store
	ConfigFile  config.File
	ProfileName string
	Profile     config.Profile
	SecretStore auth.Store
	APIClient   *api.Client
	APIKey      string
	Output      output.Options
}
