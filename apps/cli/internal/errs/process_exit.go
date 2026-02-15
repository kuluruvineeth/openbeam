package errs

import "errors"

type ProcessExit struct {
	Code int
}

func NewProcessExit(code int) *ProcessExit {
	if code < 0 {
		code = 1
	}
	return &ProcessExit{Code: code}
}

func (e *ProcessExit) Error() string {
	return ""
}

func ProcessExitCode(err error) (int, bool) {
	var exitErr *ProcessExit
	if errors.As(err, &exitErr) {
		return exitErr.Code, true
	}
	return 0, false
}
