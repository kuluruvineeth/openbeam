package errs

import (
	"context"
	"errors"
	"testing"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/exitcode"
)

func TestExitCode(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want exitcode.Code
	}{
		{name: "nil", err: nil, want: exitcode.Success},
		{name: "usage", err: New(KindUsage, "", nil), want: exitcode.Usage},
		{name: "auth", err: New(KindAuth, "", nil), want: exitcode.AuthRequired},
		{name: "forbidden", err: New(KindForbidden, "", nil), want: exitcode.Forbidden},
		{name: "notfound", err: New(KindNotFound, "", nil), want: exitcode.NotFound},
		{name: "conflict", err: New(KindConflict, "", nil), want: exitcode.Conflict},
		{name: "rate", err: New(KindRateLimited, "", nil), want: exitcode.RateLimited},
		{name: "timeout", err: New(KindTimeout, "", nil), want: exitcode.Timeout},
		{name: "network", err: New(KindNetwork, "", nil), want: exitcode.Network},
		{name: "server", err: New(KindServer, "", nil), want: exitcode.Server},
		{name: "process-exit", err: NewProcessExit(42), want: exitcode.Code(42)},
		{name: "cancelled", err: context.Canceled, want: exitcode.Cancelled},
		{name: "deadline", err: context.DeadlineExceeded, want: exitcode.Timeout},
		{name: "wrapped-cancelled", err: errors.New("x"), want: exitcode.Unknown},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ExitCode(tt.err)
			if got != tt.want {
				t.Fatalf("got %d want %d", got, tt.want)
			}
		})
	}
}
