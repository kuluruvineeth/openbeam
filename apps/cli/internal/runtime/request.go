package runtime

import (
	"context"
	"net/url"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/api"
)

func (r *Runtime) Get(ctx context.Context, path string, query url.Values) (any, api.Metadata, error) {
	return r.APIClient.GetJSON(ctx, path, query)
}

func (r *Runtime) Post(ctx context.Context, path string, query url.Values, body any) (any, api.Metadata, error) {
	return r.APIClient.PostJSON(ctx, path, query, body)
}

func (r *Runtime) Patch(ctx context.Context, path string, query url.Values, body any) (any, api.Metadata, error) {
	return r.APIClient.PatchJSON(ctx, path, query, body)
}

func (r *Runtime) Delete(ctx context.Context, path string, query url.Values) (any, api.Metadata, error) {
	return r.APIClient.DeleteJSON(ctx, path, query)
}

func (r *Runtime) Stream(ctx context.Context, path string, query url.Values, body any, handler func(api.SSEEvent) error) error {
	return r.APIClient.StreamSSE(ctx, path, query, body, handler)
}
