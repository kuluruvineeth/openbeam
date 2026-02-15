package plugin

import (
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
)

type Candidate struct {
	Name string `json:"name" yaml:"name"`
	Path string `json:"path" yaml:"path"`
}

func DefaultDir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, "openplane", "plugins"), nil
}

func SearchDirs() ([]string, error) {
	dirs := make([]string, 0)
	defaultDir, err := DefaultDir()
	if err != nil {
		return nil, err
	}
	dirs = append(dirs, defaultDir)

	for _, item := range filepath.SplitList(os.Getenv("OPENPLANE_PLUGIN_PATH")) {
		if trimmed := strings.TrimSpace(item); trimmed != "" {
			dirs = append(dirs, trimmed)
		}
	}
	for _, item := range filepath.SplitList(os.Getenv("PATH")) {
		if trimmed := strings.TrimSpace(item); trimmed != "" {
			dirs = append(dirs, trimmed)
		}
	}

	seen := map[string]struct{}{}
	unique := make([]string, 0, len(dirs))
	for _, dir := range dirs {
		cleaned := filepath.Clean(dir)
		if _, exists := seen[cleaned]; exists {
			continue
		}
		seen[cleaned] = struct{}{}
		unique = append(unique, cleaned)
	}

	return unique, nil
}

func Discover(prefix string, directories []string) ([]Candidate, error) {
	seen := map[string]struct{}{}
	candidates := make([]Candidate, 0)

	for _, directory := range directories {
		entries, err := os.ReadDir(directory)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}

			name, ok := candidateName(prefix, entry.Name())
			if !ok {
				continue
			}
			if _, exists := seen[name]; exists {
				continue
			}

			path := filepath.Join(directory, entry.Name())
			info, err := entry.Info()
			if err != nil {
				continue
			}
			if !isExecutable(path, info.Mode()) {
				continue
			}

			seen[name] = struct{}{}
			candidates = append(candidates, Candidate{Name: name, Path: path})
		}
	}

	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].Name < candidates[j].Name
	})

	return candidates, nil
}

func Lookup(prefix string, name string, directories []string) (Candidate, bool, error) {
	normalized, err := NormalizeName(name)
	if err != nil {
		return Candidate{}, false, err
	}
	searchDirs := directories
	if len(searchDirs) == 0 {
		searchDirs, err = SearchDirs()
		if err != nil {
			return Candidate{}, false, err
		}
	}
	candidates, err := Discover(prefix, searchDirs)
	if err != nil {
		return Candidate{}, false, err
	}
	for _, candidate := range candidates {
		if candidate.Name == normalized {
			return candidate, true, nil
		}
	}
	return Candidate{}, false, nil
}

func candidateName(prefix string, filename string) (string, bool) {
	trimmed := strings.TrimSpace(filename)
	if trimmed == "" {
		return "", false
	}
	needle := prefix + "-"
	if !strings.HasPrefix(trimmed, needle) {
		return "", false
	}
	name := strings.TrimPrefix(trimmed, needle)
	if runtime.GOOS == "windows" {
		name = strings.TrimSuffix(strings.ToLower(name), ".exe")
	}
	normalized, err := NormalizeName(name)
	if err != nil {
		return "", false
	}
	return normalized, true
}

func isExecutable(path string, mode os.FileMode) bool {
	if runtime.GOOS == "windows" {
		lower := strings.ToLower(path)
		return strings.HasSuffix(lower, ".exe") ||
			strings.HasSuffix(lower, ".cmd") ||
			strings.HasSuffix(lower, ".bat") ||
			strings.HasSuffix(lower, ".com") ||
			strings.HasSuffix(lower, ".ps1")
	}
	return mode.Perm()&0o111 != 0
}
