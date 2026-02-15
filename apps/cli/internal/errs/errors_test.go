package errs

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"testing"

	"github.com/openplane/openplane/apps/cli/internal/exitcode"
)

func TestNew(t *testing.T) {
	cause := errors.New("root cause")
	e := New(KindAuth, "bad token", cause)

	if e.Kind != KindAuth {
		t.Fatalf("Kind = %q, want %q", e.Kind, KindAuth)
	}
	if e.Message != "bad token" {
		t.Fatalf("Message = %q, want %q", e.Message, "bad token")
	}
	if e.Cause != cause {
		t.Fatalf("Cause = %v, want %v", e.Cause, cause)
	}
}

func TestError(t *testing.T) {
	tests := []struct {
		name    string
		err     *Error
		want    string
	}{
		{
			name: "message_only",
			err:  &Error{Kind: KindUsage, Message: "bad input"},
			want: "bad input",
		},
		{
			name: "message_with_cause",
			err:  &Error{Kind: KindNetwork, Message: "connection failed", Cause: errors.New("dial tcp")},
			want: "connection failed: dial tcp",
		},
		{
			name: "cause_only",
			err:  &Error{Kind: KindUnknown, Cause: errors.New("something broke")},
			want: "something broke",
		},
		{
			name: "empty_message_nil_cause",
			err:  &Error{Kind: KindServer},
			want: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.err.Error()
			if got != tt.want {
				t.Fatalf("Error() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestUnwrap(t *testing.T) {
	t.Run("with_cause", func(t *testing.T) {
		cause := errors.New("root")
		e := New(KindServer, "fail", cause)
		if e.Unwrap() != cause {
			t.Fatalf("Unwrap() = %v, want %v", e.Unwrap(), cause)
		}
	})

	t.Run("nil_cause", func(t *testing.T) {
		e := New(KindAuth, "denied", nil)
		if e.Unwrap() != nil {
			t.Fatalf("Unwrap() = %v, want nil", e.Unwrap())
		}
	})
}

func TestIsKind(t *testing.T) {
	tests := []struct {
		name string
		err  error
		kind Kind
		want bool
	}{
		{
			name: "matching_kind",
			err:  New(KindAuth, "denied", nil),
			kind: KindAuth,
			want: true,
		},
		{
			name: "non_matching_kind",
			err:  New(KindServer, "fail", nil),
			kind: KindAuth,
			want: false,
		},
		{
			name: "wrapped_error_matches",
			err:  fmt.Errorf("outer: %w", New(KindTimeout, "slow", nil)),
			kind: KindTimeout,
			want: true,
		},
		{
			name: "plain_error_returns_false",
			err:  errors.New("plain"),
			kind: KindUnknown,
			want: false,
		},
		{
			name: "nil_error",
			err:  nil,
			kind: KindAuth,
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsKind(tt.err, tt.kind)
			if got != tt.want {
				t.Fatalf("IsKind() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestFromHTTP(t *testing.T) {
	tests := []struct {
		name       string
		status     int
		body       map[string]any
		wantKind   Kind
		wantSubstr string
	}{
		{
			name:       "400_bad_request",
			status:     http.StatusBadRequest,
			body:       nil,
			wantKind:   KindUsage,
			wantSubstr: "request failed",
		},
		{
			name:       "401_unauthorized",
			status:     http.StatusUnauthorized,
			body:       nil,
			wantKind:   KindAuth,
			wantSubstr: "request failed",
		},
		{
			name:       "403_forbidden",
			status:     http.StatusForbidden,
			body:       nil,
			wantKind:   KindForbidden,
			wantSubstr: "request failed",
		},
		{
			name:       "404_not_found",
			status:     http.StatusNotFound,
			body:       nil,
			wantKind:   KindNotFound,
			wantSubstr: "request failed",
		},
		{
			name:       "409_conflict",
			status:     http.StatusConflict,
			body:       nil,
			wantKind:   KindConflict,
			wantSubstr: "request failed",
		},
		{
			name:       "429_rate_limited",
			status:     http.StatusTooManyRequests,
			body:       nil,
			wantKind:   KindRateLimited,
			wantSubstr: "request failed",
		},
		{
			name:       "500_server_error",
			status:     http.StatusInternalServerError,
			body:       nil,
			wantKind:   KindServer,
			wantSubstr: "request failed",
		},
		{
			name:       "502_bad_gateway",
			status:     http.StatusBadGateway,
			body:       nil,
			wantKind:   KindServer,
			wantSubstr: "request failed",
		},
		{
			name:       "503_service_unavailable",
			status:     http.StatusServiceUnavailable,
			body:       nil,
			wantKind:   KindServer,
			wantSubstr: "request failed",
		},
		{
			name:       "418_unknown_status",
			status:     http.StatusTeapot,
			body:       nil,
			wantKind:   KindUnknown,
			wantSubstr: "request failed",
		},
		{
			name:       "body_message_field",
			status:     http.StatusBadRequest,
			body:       map[string]any{"message": "email is required"},
			wantKind:   KindUsage,
			wantSubstr: "email is required",
		},
		{
			name:       "body_error_field_overrides_message",
			status:     http.StatusUnauthorized,
			body:       map[string]any{"message": "first", "error": "token expired"},
			wantKind:   KindAuth,
			wantSubstr: "token expired",
		},
		{
			name:       "body_error_field_alone",
			status:     http.StatusForbidden,
			body:       map[string]any{"error": "insufficient scope"},
			wantKind:   KindForbidden,
			wantSubstr: "insufficient scope",
		},
		{
			name:       "body_empty_strings_use_default",
			status:     http.StatusNotFound,
			body:       map[string]any{"message": "", "error": ""},
			wantKind:   KindNotFound,
			wantSubstr: "request failed",
		},
		{
			name:       "body_non_string_values_use_default",
			status:     http.StatusConflict,
			body:       map[string]any{"message": 123, "error": true},
			wantKind:   KindConflict,
			wantSubstr: "request failed",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := FromHTTP(tt.status, tt.body)
			if err == nil {
				t.Fatal("FromHTTP() returned nil")
			}
			if !IsKind(err, tt.wantKind) {
				var e *Error
				errors.As(err, &e)
				t.Fatalf("Kind = %q, want %q", e.Kind, tt.wantKind)
			}
			if got := err.Error(); got != tt.wantSubstr {
				t.Fatalf("Error() = %q, want %q", got, tt.wantSubstr)
			}
		})
	}
}

type stubNetError struct {
	timeout   bool
	temporary bool
	msg       string
}

func (e *stubNetError) Error() string   { return e.msg }
func (e *stubNetError) Timeout() bool   { return e.timeout }
func (e *stubNetError) Temporary() bool { return e.temporary }

func TestFromTransport(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		wantNil  bool
		wantKind Kind
	}{
		{
			name:    "nil_returns_nil",
			err:     nil,
			wantNil: true,
		},
		{
			name:     "context_deadline_exceeded",
			err:      context.DeadlineExceeded,
			wantKind: KindTimeout,
		},
		{
			name:    "context_canceled_returns_canceled",
			err:     context.Canceled,
			wantNil: false,
		},
		{
			name:     "url_error_wrapping_deadline",
			err:      &url.Error{Op: "Get", URL: "http://example.com", Err: context.DeadlineExceeded},
			wantKind: KindTimeout,
		},
		{
			name:     "net_timeout_error",
			err:      &stubNetError{timeout: true, msg: "i/o timeout"},
			wantKind: KindTimeout,
		},
		{
			name:     "net_non_timeout_error",
			err:      &stubNetError{timeout: false, msg: "connection refused"},
			wantKind: KindNetwork,
		},
		{
			name:     "dns_error",
			err:      &net.DNSError{Err: "no such host", Name: "example.com"},
			wantKind: KindNetwork,
		},
		{
			name:     "unknown_error",
			err:      errors.New("something weird"),
			wantKind: KindUnknown,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FromTransport(tt.err)
			if tt.wantNil {
				if got != nil {
					t.Fatalf("FromTransport() = %v, want nil", got)
				}
				return
			}
			if got == nil {
				t.Fatal("FromTransport() returned nil")
			}
			if tt.name == "context_canceled_returns_canceled" {
				if !errors.Is(got, context.Canceled) {
					t.Fatalf("expected context.Canceled, got %v", got)
				}
				return
			}
			if !IsKind(got, tt.wantKind) {
				t.Fatalf("IsKind(%q) = false for %v", tt.wantKind, got)
			}
		})
	}
}

func TestExitCodeExtended(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want exitcode.Code
	}{
		{name: "unknown_kind", err: New(Kind("custom"), "x", nil), want: exitcode.Unknown},
		{name: "wrapped_app_error", err: fmt.Errorf("wrap: %w", New(KindServer, "fail", nil)), want: exitcode.Server},
		{name: "process_exit_negative_code", err: NewProcessExit(-5), want: exitcode.Code(1)},
		{name: "process_exit_zero", err: NewProcessExit(0), want: exitcode.Success},
		{name: "plain_error", err: errors.New("random"), want: exitcode.Unknown},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ExitCode(tt.err)
			if got != tt.want {
				t.Fatalf("ExitCode() = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestProcessExit(t *testing.T) {
	t.Run("error_returns_empty_string", func(t *testing.T) {
		pe := NewProcessExit(42)
		if pe.Error() != "" {
			t.Fatalf("Error() = %q, want empty string", pe.Error())
		}
	})

	t.Run("negative_code_clamped_to_one", func(t *testing.T) {
		pe := NewProcessExit(-10)
		if pe.Code != 1 {
			t.Fatalf("Code = %d, want 1", pe.Code)
		}
	})

	t.Run("zero_code_preserved", func(t *testing.T) {
		pe := NewProcessExit(0)
		if pe.Code != 0 {
			t.Fatalf("Code = %d, want 0", pe.Code)
		}
	})

	t.Run("positive_code_preserved", func(t *testing.T) {
		pe := NewProcessExit(127)
		if pe.Code != 127 {
			t.Fatalf("Code = %d, want 127", pe.Code)
		}
	})
}

func TestProcessExitCode(t *testing.T) {
	t.Run("returns_code_for_process_exit", func(t *testing.T) {
		code, ok := ProcessExitCode(NewProcessExit(42))
		if !ok {
			t.Fatal("ok = false, want true")
		}
		if code != 42 {
			t.Fatalf("code = %d, want 42", code)
		}
	})

	t.Run("returns_false_for_non_process_exit", func(t *testing.T) {
		_, ok := ProcessExitCode(errors.New("not a process exit"))
		if ok {
			t.Fatal("ok = true, want false")
		}
	})

	t.Run("returns_code_for_wrapped_process_exit", func(t *testing.T) {
		wrapped := fmt.Errorf("outer: %w", NewProcessExit(7))
		code, ok := ProcessExitCode(wrapped)
		if !ok {
			t.Fatal("ok = false, want true")
		}
		if code != 7 {
			t.Fatalf("code = %d, want 7", code)
		}
	})
}
