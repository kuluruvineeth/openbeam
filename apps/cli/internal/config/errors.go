package config

import "fmt"

type ProfileNotFoundError struct {
	Name string
}

func (e *ProfileNotFoundError) Error() string {
	return fmt.Sprintf("profile %q not found", e.Name)
}

func NewProfileNotFoundError(name string) error {
	return &ProfileNotFoundError{Name: name}
}
