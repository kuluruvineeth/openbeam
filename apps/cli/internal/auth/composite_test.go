package auth

import (
	"errors"
	"testing"
)

type memStore struct {
	data    map[string]string
	failSet bool
}

func newMemStore() *memStore {
	return &memStore{data: map[string]string{}}
}

func newFailingMemStore() *memStore {
	return &memStore{data: map[string]string{}, failSet: true}
}

func (m *memStore) Get(key string) (string, error) {
	v, ok := m.data[key]
	if !ok {
		return "", ErrSecretNotFound
	}
	return v, nil
}

func (m *memStore) Set(key string, value string) error {
	if m.failSet {
		return errors.New("set failed")
	}
	m.data[key] = value
	return nil
}

func (m *memStore) Delete(key string) error {
	delete(m.data, key)
	return nil
}

func TestCompositeGet(t *testing.T) {
	t.Run("primary_hit", func(t *testing.T) {
		primary := newMemStore()
		primary.data["token"] = "abc123"
		fallback := newMemStore()
		fallback.data["token"] = "should_not_use"

		cs := NewCompositeStore(primary, fallback)
		val, err := cs.Get("token")
		if err != nil {
			t.Fatal(err)
		}
		if val != "abc123" {
			t.Fatalf("Get() = %q, want %q", val, "abc123")
		}
	})

	t.Run("primary_miss_fallback_hit", func(t *testing.T) {
		primary := newMemStore()
		fallback := newMemStore()
		fallback.data["token"] = "fallback_value"

		cs := NewCompositeStore(primary, fallback)
		val, err := cs.Get("token")
		if err != nil {
			t.Fatal(err)
		}
		if val != "fallback_value" {
			t.Fatalf("Get() = %q, want %q", val, "fallback_value")
		}
	})

	t.Run("both_miss", func(t *testing.T) {
		primary := newMemStore()
		fallback := newMemStore()

		cs := NewCompositeStore(primary, fallback)
		_, err := cs.Get("missing")
		if !errors.Is(err, ErrSecretNotFound) {
			t.Fatalf("Get() error = %v, want ErrSecretNotFound", err)
		}
	})

	t.Run("nil_primary_fallback_hit", func(t *testing.T) {
		fallback := newMemStore()
		fallback.data["key"] = "val"

		cs := NewCompositeStore(nil, fallback)
		val, err := cs.Get("key")
		if err != nil {
			t.Fatal(err)
		}
		if val != "val" {
			t.Fatalf("Get() = %q, want %q", val, "val")
		}
	})

	t.Run("nil_primary_nil_fallback", func(t *testing.T) {
		cs := NewCompositeStore(nil, nil)
		_, err := cs.Get("key")
		if !errors.Is(err, ErrSecretNotFound) {
			t.Fatalf("Get() error = %v, want ErrSecretNotFound", err)
		}
	})

	t.Run("primary_non_notfound_error_no_fallback", func(t *testing.T) {
		primary := &errorStore{err: errors.New("keychain locked")}
		cs := NewCompositeStore(primary, nil)
		_, err := cs.Get("key")
		if err == nil || err.Error() != "keychain locked" {
			t.Fatalf("Get() error = %v, want keychain locked", err)
		}
	})

	t.Run("primary_non_notfound_error_with_fallback", func(t *testing.T) {
		primary := &errorStore{err: errors.New("keychain locked")}
		fallback := newMemStore()
		fallback.data["key"] = "from_fallback"

		cs := NewCompositeStore(primary, fallback)
		val, err := cs.Get("key")
		if err != nil {
			t.Fatal(err)
		}
		if val != "from_fallback" {
			t.Fatalf("Get() = %q, want %q", val, "from_fallback")
		}
	})
}

type errorStore struct {
	err error
}

func (e *errorStore) Get(_ string) (string, error) { return "", e.err }
func (e *errorStore) Set(_ string, _ string) error  { return e.err }
func (e *errorStore) Delete(_ string) error          { return e.err }

func TestCompositeSet(t *testing.T) {
	t.Run("primary_success_cleans_fallback", func(t *testing.T) {
		primary := newMemStore()
		fallback := newMemStore()
		fallback.data["token"] = "stale"

		cs := NewCompositeStore(primary, fallback)
		if err := cs.Set("token", "fresh"); err != nil {
			t.Fatal(err)
		}
		if primary.data["token"] != "fresh" {
			t.Fatalf("primary[token] = %q, want %q", primary.data["token"], "fresh")
		}
		if _, ok := fallback.data["token"]; ok {
			t.Fatal("fallback should have token deleted after primary success")
		}
	})

	t.Run("primary_fail_uses_fallback", func(t *testing.T) {
		primary := newFailingMemStore()
		fallback := newMemStore()

		cs := NewCompositeStore(primary, fallback)
		if err := cs.Set("token", "value"); err != nil {
			t.Fatal(err)
		}
		if fallback.data["token"] != "value" {
			t.Fatalf("fallback[token] = %q, want %q", fallback.data["token"], "value")
		}
	})

	t.Run("primary_fail_no_fallback", func(t *testing.T) {
		primary := newFailingMemStore()
		cs := NewCompositeStore(primary, nil)
		err := cs.Set("token", "value")
		if err == nil {
			t.Fatal("expected error when primary fails and no fallback")
		}
	})

	t.Run("nil_primary_uses_fallback", func(t *testing.T) {
		fallback := newMemStore()
		cs := NewCompositeStore(nil, fallback)
		if err := cs.Set("key", "val"); err != nil {
			t.Fatal(err)
		}
		if fallback.data["key"] != "val" {
			t.Fatalf("fallback[key] = %q, want %q", fallback.data["key"], "val")
		}
	})

	t.Run("nil_primary_nil_fallback", func(t *testing.T) {
		cs := NewCompositeStore(nil, nil)
		err := cs.Set("key", "val")
		if err != nil {
			t.Fatalf("Set() error = %v, want nil", err)
		}
	})
}

func TestCompositeDelete(t *testing.T) {
	t.Run("clears_both_stores", func(t *testing.T) {
		primary := newMemStore()
		primary.data["token"] = "p"
		fallback := newMemStore()
		fallback.data["token"] = "f"

		cs := NewCompositeStore(primary, fallback)
		if err := cs.Delete("token"); err != nil {
			t.Fatal(err)
		}
		if _, ok := primary.data["token"]; ok {
			t.Fatal("primary should not have token after delete")
		}
		if _, ok := fallback.data["token"]; ok {
			t.Fatal("fallback should not have token after delete")
		}
	})

	t.Run("ignores_delete_errors", func(t *testing.T) {
		primary := &errorStore{err: errors.New("fail")}
		fallback := &errorStore{err: errors.New("fail")}

		cs := NewCompositeStore(primary, fallback)
		err := cs.Delete("key")
		if err != nil {
			t.Fatalf("Delete() error = %v, want nil (errors should be ignored)", err)
		}
	})

	t.Run("nil_stores", func(t *testing.T) {
		cs := NewCompositeStore(nil, nil)
		err := cs.Delete("key")
		if err != nil {
			t.Fatalf("Delete() error = %v, want nil", err)
		}
	})
}
