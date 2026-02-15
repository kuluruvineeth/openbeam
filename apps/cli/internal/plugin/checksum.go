package plugin

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"go.yaml.in/yaml/v3"
)

var ErrChecksumMismatch = errors.New("plugin checksum mismatch")

type Manifest struct {
	Checksums map[string]string `yaml:"checksums"`
}

func manifestPath(pluginDir string) string {
	return filepath.Join(pluginDir, ".checksums.yaml")
}

func LoadManifest(pluginDir string) (*Manifest, error) {
	data, err := os.ReadFile(manifestPath(pluginDir))
	if errors.Is(err, os.ErrNotExist) {
		return &Manifest{Checksums: map[string]string{}}, nil
	}
	if err != nil {
		return nil, err
	}
	var m Manifest
	if err := yaml.Unmarshal(data, &m); err != nil {
		return nil, err
	}
	if m.Checksums == nil {
		m.Checksums = map[string]string{}
	}
	return &m, nil
}

func SaveManifest(pluginDir string, m *Manifest) error {
	data, err := yaml.Marshal(m)
	if err != nil {
		return err
	}
	return os.WriteFile(manifestPath(pluginDir), data, 0o600)
}

func ComputeChecksum(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer func() { _ = f.Close() }()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func RecordChecksum(pluginDir string, name string, path string) error {
	m, err := LoadManifest(pluginDir)
	if err != nil {
		return err
	}
	checksum, err := ComputeChecksum(path)
	if err != nil {
		return err
	}
	m.Checksums[name] = checksum
	return SaveManifest(pluginDir, m)
}

func VerifyInstalled(pluginDir string, name string, path string) error {
	if !isInsideDir(path, pluginDir) {
		return nil
	}
	m, err := LoadManifest(pluginDir)
	if err != nil {
		return nil
	}
	expected, ok := m.Checksums[name]
	if !ok {
		return nil
	}
	actual, err := ComputeChecksum(path)
	if err != nil {
		return fmt.Errorf("compute checksum for plugin %q: %w", name, err)
	}
	if actual != expected {
		return fmt.Errorf("plugin %q: %w", name, ErrChecksumMismatch)
	}
	return nil
}

func isInsideDir(path string, dir string) bool {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return false
	}
	absDir, err := filepath.Abs(dir)
	if err != nil {
		return false
	}
	return strings.HasPrefix(absPath, absDir+string(filepath.Separator))
}
