package config

import "time"

type Profile struct {
	Name      string        `yaml:"name"`
	Host      string        `yaml:"host"`
	Team      string        `yaml:"team,omitempty"`
	Output    string        `yaml:"output,omitempty"`
	Color     string        `yaml:"color,omitempty"`
	Timeout   time.Duration `yaml:"timeout,omitempty"`
	APIKeyRef string        `yaml:"api_key_ref,omitempty"`
}

type File struct {
	CurrentProfile string             `yaml:"current_profile"`
	Profiles       map[string]Profile `yaml:"profiles"`
}
