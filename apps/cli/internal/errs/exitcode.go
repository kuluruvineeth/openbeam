package errs

import (
	"context"
	"errors"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/exitcode"
)

func ExitCode(err error) exitcode.Code {
	if err == nil {
		return exitcode.Success
	}
	if code, ok := ProcessExitCode(err); ok {
		return exitcode.Code(code)
	}
	if errors.Is(err, context.Canceled) {
		return exitcode.Cancelled
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return exitcode.Timeout
	}
	var appErr *Error
	if !errors.As(err, &appErr) {
		return exitcode.Unknown
	}
	switch appErr.Kind {
	case KindUsage:
		return exitcode.Usage
	case KindAuth:
		return exitcode.AuthRequired
	case KindForbidden:
		return exitcode.Forbidden
	case KindNotFound:
		return exitcode.NotFound
	case KindConflict:
		return exitcode.Conflict
	case KindRateLimited:
		return exitcode.RateLimited
	case KindTimeout:
		return exitcode.Timeout
	case KindNetwork:
		return exitcode.Network
	case KindServer:
		return exitcode.Server
	default:
		return exitcode.Unknown
	}
}
