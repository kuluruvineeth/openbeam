package plugin

import (
	"errors"
	"io"
	"os"
	"path/filepath"
	"runtime"
)

type InstallResult struct {
	Name string `json:"name" yaml:"name"`
	Path string `json:"path" yaml:"path"`
}

func InstallLocal(prefix string, name string, sourcePath string, targetDir string) (InstallResult, error) {
	normalized, err := NormalizeName(name)
	if err != nil {
		return InstallResult{}, err
	}
	if sourcePath == "" {
		return InstallResult{}, errors.New("source path is required")
	}
	info, err := os.Stat(sourcePath)
	if err != nil {
		return InstallResult{}, err
	}
	if info.IsDir() {
		return InstallResult{}, errors.New("source path is a directory: " + sourcePath)
	}
	installDir := targetDir
	if installDir == "" {
		installDir, err = DefaultDir()
		if err != nil {
			return InstallResult{}, err
		}
	}
	if err := os.MkdirAll(installDir, 0o700); err != nil {
		return InstallResult{}, err
	}
	targetPath := filepath.Join(installDir, ExecutableName(prefix, normalized))
	sourceFile, err := os.Open(sourcePath)
	if err != nil {
		return InstallResult{}, err
	}
	defer func() { _ = sourceFile.Close() }()

	targetFile, err := os.OpenFile(targetPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o700)
	if err != nil {
		return InstallResult{}, err
	}
	_, err = io.Copy(targetFile, sourceFile)
	closeErr := targetFile.Close()
	if err != nil {
		return InstallResult{}, err
	}
	if closeErr != nil {
		return InstallResult{}, closeErr
	}
	if runtime.GOOS != "windows" {
		if err := os.Chmod(targetPath, 0o755); err != nil {
			return InstallResult{}, err
		}
	}
	_ = RecordChecksum(installDir, normalized, targetPath)
	return InstallResult{Name: normalized, Path: targetPath}, nil
}
