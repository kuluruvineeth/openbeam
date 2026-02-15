package auth

import (
	"errors"

	"github.com/zalando/go-keyring"
)

type KeyringStore struct {
	service string
}

func NewKeyringStore(service string) *KeyringStore {
	return &KeyringStore{service: service}
}

func (s *KeyringStore) Get(key string) (string, error) {
	value, err := keyring.Get(s.service, key)
	if errors.Is(err, keyring.ErrNotFound) {
		return "", ErrSecretNotFound
	}
	if err != nil {
		return "", err
	}
	return value, nil
}

func (s *KeyringStore) Set(key string, value string) error {
	return keyring.Set(s.service, key, value)
}

func (s *KeyringStore) Delete(key string) error {
	err := keyring.Delete(s.service, key)
	if errors.Is(err, keyring.ErrNotFound) {
		return nil
	}
	return err
}
