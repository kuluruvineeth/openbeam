package shared

import (
	"context"
	"encoding/json"
	"net/url"
	"strconv"
	"strings"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/runtime"
)

type RuntimeProvider func() (*runtime.Runtime, error)

func QueryFromMap(values map[string]string) url.Values {
	query := url.Values{}
	for key, value := range values {
		if value == "" {
			continue
		}
		query.Set(key, value)
	}
	return query
}

func QueryFromMapAndLists(values map[string]string, lists map[string][]string) url.Values {
	query := QueryFromMap(values)
	for key, list := range lists {
		for _, item := range list {
			if item == "" {
				continue
			}
			query.Add(key, item)
		}
	}
	return query
}

func IntToString(value int) string {
	return strconv.Itoa(value)
}

func Path(base string, segments ...string) string {
	path := strings.TrimRight(strings.TrimSpace(base), "/")
	if path == "" {
		path = "/"
	}
	for _, segment := range segments {
		trimmed := strings.Trim(strings.TrimSpace(segment), "/")
		path += "/" + url.PathEscape(trimmed)
	}
	return path
}

func PostAndRender(ctx context.Context, provider RuntimeProvider, command string, path string, query url.Values, body any, requireAuth bool) error {
	return postAndRender(ctx, provider, command, path, query, body, requireAuth, false)
}

func PostMutationAndRender(ctx context.Context, provider RuntimeProvider, command string, path string, query url.Values, body any, requireAuth bool) error {
	return postAndRender(ctx, provider, command, path, query, body, requireAuth, true)
}

func postAndRender(
	ctx context.Context,
	provider RuntimeProvider,
	command string,
	path string,
	query url.Values,
	body any,
	requireAuth bool,
	requireYes bool,
) error {
	rt, err := provider()
	if err != nil {
		return err
	}
	if requireAuth {
		if err := rt.RequireAPIKey(); err != nil {
			return err
		}
	}
	if requireYes {
		if err := rt.RequireYesForNonInteractive(); err != nil {
			return err
		}
	}
	result, meta, err := rt.Post(ctx, path, query, body)
	if err != nil {
		return err
	}
	if err := rt.WriteEnvelope(command, result, meta); err != nil {
		return err
	}
	return nil
}

func GetAndRender(ctx context.Context, provider RuntimeProvider, command string, path string, query url.Values, requireAuth bool) error {
	rt, err := provider()
	if err != nil {
		return err
	}
	if requireAuth {
		if err := rt.RequireAPIKey(); err != nil {
			return err
		}
	}
	result, meta, err := rt.Get(ctx, path, query)
	if err != nil {
		return err
	}
	if err := rt.WriteEnvelope(command, result, meta); err != nil {
		return err
	}
	return nil
}

func PatchAndRender(ctx context.Context, provider RuntimeProvider, command string, path string, query url.Values, body any, requireAuth bool) error {
	return patchAndRender(ctx, provider, command, path, query, body, requireAuth, false)
}

func PatchMutationAndRender(ctx context.Context, provider RuntimeProvider, command string, path string, query url.Values, body any, requireAuth bool) error {
	return patchAndRender(ctx, provider, command, path, query, body, requireAuth, true)
}

func patchAndRender(
	ctx context.Context,
	provider RuntimeProvider,
	command string,
	path string,
	query url.Values,
	body any,
	requireAuth bool,
	requireYes bool,
) error {
	rt, err := provider()
	if err != nil {
		return err
	}
	if requireAuth {
		if err := rt.RequireAPIKey(); err != nil {
			return err
		}
	}
	if requireYes {
		if err := rt.RequireYesForNonInteractive(); err != nil {
			return err
		}
	}
	result, meta, err := rt.Patch(ctx, path, query, body)
	if err != nil {
		return err
	}
	if err := rt.WriteEnvelope(command, result, meta); err != nil {
		return err
	}
	return nil
}

func DeleteAndRender(ctx context.Context, provider RuntimeProvider, command string, path string, query url.Values, requireAuth bool) error {
	return deleteAndRender(ctx, provider, command, path, query, requireAuth, false)
}

func DeleteMutationAndRender(ctx context.Context, provider RuntimeProvider, command string, path string, query url.Values, requireAuth bool) error {
	return deleteAndRender(ctx, provider, command, path, query, requireAuth, true)
}

func deleteAndRender(
	ctx context.Context,
	provider RuntimeProvider,
	command string,
	path string,
	query url.Values,
	requireAuth bool,
	requireYes bool,
) error {
	rt, err := provider()
	if err != nil {
		return err
	}
	if requireAuth {
		if err := rt.RequireAPIKey(); err != nil {
			return err
		}
	}
	if requireYes {
		if err := rt.RequireYesForNonInteractive(); err != nil {
			return err
		}
	}
	result, meta, err := rt.Delete(ctx, path, query)
	if err != nil {
		return err
	}
	if err := rt.WriteEnvelope(command, result, meta); err != nil {
		return err
	}
	return nil
}

func Int64ToString(value int64) string {
	return strconv.FormatInt(value, 10)
}

func SetOptionalInt64(query url.Values, key string, value int64) {
	if value != 0 {
		query.Set(key, Int64ToString(value))
	}
}

func SetOptionalInt(query url.Values, key string, value int) {
	if value != 0 {
		query.Set(key, IntToString(value))
	}
}

func ParseJSONObject(raw string) (map[string]any, error) {
	payload := map[string]any{}
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		return nil, err
	}
	return payload, nil
}
