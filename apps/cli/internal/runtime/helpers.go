package runtime

import (
	"fmt"
	"io"
	"strings"

	"github.com/openplane/openplane/apps/cli/internal/api"
	"github.com/openplane/openplane/apps/cli/internal/errs"
	"github.com/openplane/openplane/apps/cli/internal/output"
)

func (r *Runtime) RequireAPIKey() error {
	if r.APIKey != "" {
		return nil
	}
	return errs.New(errs.KindAuth, "no API key configured, run openplane auth login or set OPENPLANE_API_KEY", nil)
}

func (r *Runtime) RequireYesForNonInteractive() error {
	if !r.Options.NonInteractive {
		return nil
	}
	if r.Options.Yes {
		return nil
	}
	return errs.New(errs.KindUsage, "--yes is required with --non-interactive for mutating commands", nil)
}

func (r *Runtime) WriteEnvelope(command string, result any, meta api.Metadata) error {
	if r.Output.Raw {
		switch typed := result.(type) {
		case []byte:
			_, err := r.Streams.Out.Write(appendLineBreak(typed))
			return err
		case string:
			WriteString(r.Streams.Out, strings.TrimRight(typed, "\n")+"\n")
			return nil
		default:
			return output.Render(r.Streams.Out, result, output.Options{Format: output.FormatJSON})
		}
	}
	env := output.Envelope{
		SchemaVersion: "1.0",
		Command:       command,
		Result:        result,
		Meta:          meta,
	}
	if err := output.Render(r.Streams.Out, env, r.Output); err != nil {
		return errs.New(errs.KindUnknown, "render output failed", err)
	}
	return nil
}

func (r *Runtime) PrintErr(format string, values ...any) {
	_, _ = fmt.Fprintf(r.Streams.Err, format+"\n", values...)
}

func WriteString(w io.Writer, value string) {
	_, _ = io.WriteString(w, value)
}

func appendLineBreak(payload []byte) []byte {
	if len(payload) == 0 || payload[len(payload)-1] == '\n' {
		return payload
	}
	next := make([]byte, len(payload)+1)
	copy(next, payload)
	next[len(next)-1] = '\n'
	return next
}
