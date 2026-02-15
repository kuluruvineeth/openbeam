package plugin

import (
	"errors"
	"regexp"
	"runtime"
	"strings"
)

var validPluginName = regexp.MustCompile(`^[a-z0-9][a-z0-9-]*$`)

func NormalizeName(name string) (string, error) {
	normalized := strings.ToLower(strings.TrimSpace(name))
	if !validPluginName.MatchString(normalized) {
		return "", errors.New("invalid plugin name: " + name)
	}
	return normalized, nil
}

func ExecutableName(prefix string, name string) string {
	filename := prefix + "-" + name
	if runtime.GOOS == "windows" && !strings.HasSuffix(strings.ToLower(filename), ".exe") {
		filename += ".exe"
	}
	return filename
}
