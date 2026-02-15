package auth

import "errors"

type CompositeStore struct {
	primary  Store
	fallback Store
}

func NewCompositeStore(primary Store, fallback Store) *CompositeStore {
	return &CompositeStore{primary: primary, fallback: fallback}
}

func (s *CompositeStore) Get(key string) (string, error) {
	if s.primary != nil {
		value, err := s.primary.Get(key)
		if err == nil {
			return value, nil
		}
		if !errors.Is(err, ErrSecretNotFound) && s.fallback == nil {
			return "", err
		}
	}
	if s.fallback != nil {
		return s.fallback.Get(key)
	}
	return "", ErrSecretNotFound
}

func (s *CompositeStore) Set(key string, value string) error {
	var primaryErr error
	if s.primary != nil {
		if err := s.primary.Set(key, value); err == nil {
			if s.fallback != nil {
				_ = s.fallback.Delete(key)
			}
			return nil
		} else {
			primaryErr = err
		}
	}
	if s.fallback != nil {
		return s.fallback.Set(key, value)
	}
	if primaryErr != nil {
		return primaryErr
	}
	return nil
}

func (s *CompositeStore) Delete(key string) error {
	if s.primary != nil {
		_ = s.primary.Delete(key)
	}
	if s.fallback != nil {
		_ = s.fallback.Delete(key)
	}
	return nil
}
