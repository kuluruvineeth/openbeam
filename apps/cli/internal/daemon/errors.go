package daemon

import "fmt"

type DaemonNotRunningError struct {
	Listen string
	Cause  error
}

func (e *DaemonNotRunningError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("cannot connect to daemon at %s: %v", e.Listen, e.Cause)
	}
	return fmt.Sprintf("cannot connect to daemon at %s", e.Listen)
}

func (e *DaemonNotRunningError) Unwrap() error {
	return e.Cause
}

type AgentNotFoundError struct {
	ID string
}

func (e *AgentNotFoundError) Error() string {
	return fmt.Sprintf("agent not found: %s", e.ID)
}

type NoAgentsMatchError struct {
	Filter string
}

func (e *NoAgentsMatchError) Error() string {
	return fmt.Sprintf("no agents match filter: %s", e.Filter)
}
