package config

import (
	"errors"
	"os"
	"path/filepath"
	"time"

	"go.yaml.in/yaml/v3"
)

type Store struct {
	path string
}

func DefaultPath() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "openplane", "config.yaml"), nil
}

func NewStore(path string) (*Store, error) {
	if path == "" {
		resolved, err := DefaultPath()
		if err != nil {
			return nil, err
		}
		path = resolved
	}
	return &Store{path: path}, nil
}

func (s *Store) Path() string {
	return s.path
}

func (s *Store) Load() (File, error) {
	payload, err := os.ReadFile(s.path)
	if errors.Is(err, os.ErrNotExist) {
		return defaultFile(), nil
	}
	if err != nil {
		return File{}, err
	}

	cfg := File{}
	if err := yaml.Unmarshal(payload, &cfg); err != nil {
		return File{}, err
	}
	if len(cfg.Profiles) == 0 {
		cfg = defaultFile()
	}
	if cfg.CurrentProfile == "" {
		cfg.CurrentProfile = "default"
	}
	for name, profile := range cfg.Profiles {
		if profile.Name == "" {
			profile.Name = name
		}
		if profile.Host == "" {
			profile.Host = "http://localhost:3000"
		}
		if profile.Color == "" {
			profile.Color = "auto"
		}
		if profile.Timeout == 0 {
			profile.Timeout = 30 * time.Second
		}
		cfg.Profiles[name] = profile
	}
	return cfg, nil
}

func (s *Store) Save(cfg File) error {
	if len(cfg.Profiles) == 0 {
		cfg = defaultFile()
	}
	if cfg.CurrentProfile == "" {
		cfg.CurrentProfile = "default"
	}
	dir := filepath.Dir(s.path)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	payload, err := yaml.Marshal(cfg)
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, payload, 0o600)
}

func (s *Store) Resolve(profileName string) (File, Profile, string, error) {
	cfg, err := s.Load()
	if err != nil {
		return File{}, Profile{}, "", err
	}
	name := profileName
	if name == "" {
		name = cfg.CurrentProfile
	}
	profile, ok := cfg.Profiles[name]
	if !ok {
		return File{}, Profile{}, "", NewProfileNotFoundError(name)
	}
	if profile.Name == "" {
		profile.Name = name
	}
	return cfg, profile, name, nil
}

func defaultFile() File {
	return File{
		CurrentProfile: "default",
		Profiles: map[string]Profile{
			"default": {
				Name:    "default",
				Host:    "http://localhost:3000",
				Color:   "auto",
				Timeout: 30 * time.Second,
			},
		},
	}
}
