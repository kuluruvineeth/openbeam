package auth

import "errors"

var ErrSecretNotFound = errors.New("secret not found")

type Store interface {
	Get(key string) (string, error)
	Set(key string, value string) error
	Delete(key string) error
}
