package errs

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
)

type Kind string

const (
	KindUsage       Kind = "usage"
	KindAuth        Kind = "auth"
	KindForbidden   Kind = "forbidden"
	KindNotFound    Kind = "not_found"
	KindConflict    Kind = "conflict"
	KindRateLimited Kind = "rate_limited"
	KindTimeout     Kind = "timeout"
	KindNetwork     Kind = "network"
	KindServer      Kind = "server"
	KindUnknown     Kind = "unknown"
)

type Error struct {
	Kind    Kind
	Message string
	Cause   error
}

func (e *Error) Error() string {
	if e.Cause == nil {
		return e.Message
	}
	if e.Message == "" {
		return e.Cause.Error()
	}
	return fmt.Sprintf("%s: %v", e.Message, e.Cause)
}

func (e *Error) Unwrap() error {
	return e.Cause
}

func New(kind Kind, message string, cause error) *Error {
	return &Error{Kind: kind, Message: message, Cause: cause}
}

func IsKind(err error, kind Kind) bool {
	var target *Error
	if !errors.As(err, &target) {
		return false
	}
	return target.Kind == kind
}

func FromHTTP(status int, body map[string]any) error {
	message := "request failed"
	if raw, ok := body["message"]; ok {
		if v, ok := raw.(string); ok && v != "" {
			message = v
		}
	}
	if raw, ok := body["error"]; ok {
		if v, ok := raw.(string); ok && v != "" {
			message = v
		}
	}
	switch status {
	case http.StatusBadRequest:
		return New(KindUsage, message, nil)
	case http.StatusUnauthorized:
		return New(KindAuth, message, nil)
	case http.StatusForbidden:
		return New(KindForbidden, message, nil)
	case http.StatusNotFound:
		return New(KindNotFound, message, nil)
	case http.StatusConflict:
		return New(KindConflict, message, nil)
	case http.StatusTooManyRequests:
		return New(KindRateLimited, message, nil)
	default:
		if status >= 500 {
			return New(KindServer, message, nil)
		}
		return New(KindUnknown, message, nil)
	}
}

func FromTransport(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, context.Canceled) {
		return context.Canceled
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return New(KindTimeout, "request timed out", err)
	}
	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		if errors.Is(urlErr.Err, context.DeadlineExceeded) {
			return New(KindTimeout, "request timed out", err)
		}
	}
	var ne net.Error
	if errors.As(err, &ne) {
		if ne.Timeout() {
			return New(KindTimeout, "request timed out", err)
		}
		return New(KindNetwork, "network request failed", err)
	}
	return New(KindUnknown, "request failed", err)
}
