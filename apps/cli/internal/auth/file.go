package auth

import (
	"errors"
	"os"
	"path/filepath"

	"go.yaml.in/yaml/v3"
)

type FileStore struct {
	path string
}

type fileSecrets struct {
	Values map[string]string `yaml:"values"`
}

func DefaultFilePath() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "openplane", "secrets.yaml"), nil
}

func NewFileStore(path string) (*FileStore, error) {
	if path == "" {
		resolved, err := DefaultFilePath()
		if err != nil {
			return nil, err
		}
		path = resolved
	}
	return &FileStore{path: path}, nil
}

func (s *FileStore) Get(key string) (string, error) {
	payload, err := os.ReadFile(s.path)
	if errors.Is(err, os.ErrNotExist) {
		return "", ErrSecretNotFound
	}
	if err != nil {
		return "", err
	}
	var data fileSecrets
	if err := yaml.Unmarshal(payload, &data); err != nil {
		return "", err
	}
	if data.Values == nil {
		return "", ErrSecretNotFound
	}
	value, ok := data.Values[key]
	if !ok {
		return "", ErrSecretNotFound
	}
	return value, nil
}

func (s *FileStore) Set(key string, value string) error {
	data := fileSecrets{Values: map[string]string{}}
	payload, err := os.ReadFile(s.path)
	if err == nil {
		_ = yaml.Unmarshal(payload, &data)
	}
	if data.Values == nil {
		data.Values = map[string]string{}
	}
	data.Values[key] = value
	encoded, err := yaml.Marshal(data)
	if err != nil {
		return err
	}
	dir := filepath.Dir(s.path)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	return os.WriteFile(s.path, encoded, 0o600)
}

func (s *FileStore) Delete(key string) error {
	payload, err := os.ReadFile(s.path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	var data fileSecrets
	if err := yaml.Unmarshal(payload, &data); err != nil {
		return err
	}
	if data.Values == nil {
		return nil
	}
	delete(data.Values, key)
	encoded, err := yaml.Marshal(data)
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, encoded, 0o600)
}
