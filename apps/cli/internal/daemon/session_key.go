package daemon

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"path/filepath"
	"strings"
)

const sessionKeyFile = "session.key"

func SessionKeyPath(daemonHome string) string {
	return filepath.Join(daemonHome, sessionKeyFile)
}

func LoadOrCreateSessionKey(daemonHome string) (string, error) {
	keyPath := SessionKeyPath(daemonHome)
	data, err := os.ReadFile(keyPath)
	if err == nil {
		key := strings.TrimSpace(string(data))
		if key != "" {
			return key, nil
		}
	}

	key, err := generateSessionKey()
	if err != nil {
		return "", err
	}

	if mkErr := os.MkdirAll(daemonHome, 0o755); mkErr != nil {
		return "", mkErr
	}

	if writeErr := os.WriteFile(keyPath, []byte(key+"\n"), 0o600); writeErr != nil {
		return "", writeErr
	}

	return key, nil
}

func generateSessionKey() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
