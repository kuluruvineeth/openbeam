package output

import "github.com/openplane/openplane/apps/cli/internal/api"

type Format string

const (
	FormatTable  Format = "table"
	FormatJSON   Format = "json"
	FormatYAML   Format = "yaml"
	FormatNDJSON Format = "ndjson"
)

func (f Format) IsValid() bool {
	switch f {
	case FormatTable, FormatJSON, FormatYAML, FormatNDJSON:
		return true
	default:
		return false
	}
}

func (f Format) SupportsTransform() bool {
	switch f {
	case FormatJSON, FormatYAML, FormatNDJSON:
		return true
	default:
		return false
	}
}

type Options struct {
	Format   Format
	JQ       string
	Template string
	Raw      bool
}

type Envelope struct {
	SchemaVersion string       `json:"schema_version" yaml:"schema_version"`
	Command       string       `json:"command" yaml:"command"`
	Result        any          `json:"result" yaml:"result"`
	Meta          api.Metadata `json:"meta" yaml:"meta"`
}
