package mcp

import (
	"context"
	"net/url"
	"testing"
)

func TestHTTPAdapterInitialize(t *testing.T) {
	adapter := NewHTTPAdapter(
		func(_ context.Context, _ string, _ url.Values) (any, error) { return nil, nil },
		func(_ context.Context, _ string, _ url.Values, _ any) (any, error) { return nil, nil },
	)
	response := adapter.Handle(context.Background(), Request{
		JSONRPC: "2.0",
		ID:      "1",
		Method:  "initialize",
	})
	if response.Error != nil {
		t.Fatalf("unexpected error: %+v", response.Error)
	}
	if response.ID != "1" {
		t.Fatalf("unexpected id: %#v", response.ID)
	}
}

func TestHTTPAdapterToolsCallRouting(t *testing.T) {
	var gotPath string
	var gotBody any
	adapter := NewHTTPAdapter(
		func(_ context.Context, _ string, _ url.Values) (any, error) {
			return map[string]any{}, nil
		},
		func(_ context.Context, path string, _ url.Values, body any) (any, error) {
			gotPath = path
			gotBody = body
			return map[string]any{"ok": true}, nil
		},
	)

	response := adapter.Handle(context.Background(), Request{
		JSONRPC: "2.0",
		ID:      "42",
		Method:  "tools/call",
		Params: map[string]any{
			"name": "search",
			"arguments": map[string]any{
				"query": "roadmap",
			},
		},
	})
	if response.Error != nil {
		t.Fatalf("unexpected error: %+v", response.Error)
	}
	if gotPath != "/api/mcp/tools/search/call" {
		t.Fatalf("unexpected path: %s", gotPath)
	}
	object, ok := gotBody.(map[string]any)
	if !ok {
		t.Fatalf("unexpected body type: %T", gotBody)
	}
	if _, ok := object["arguments"].(map[string]any); !ok {
		t.Fatalf("unexpected body payload: %#v", object)
	}
}
