package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
)

type Getter func(context.Context, string, url.Values) (any, error)
type Poster func(context.Context, string, url.Values, any) (any, error)

type HTTPAdapter struct {
	get  Getter
	post Poster
}

func NewHTTPAdapter(get Getter, post Poster) *HTTPAdapter {
	return &HTTPAdapter{
		get:  get,
		post: post,
	}
}

func (a *HTTPAdapter) Handle(ctx context.Context, request Request) Response {
	response := Response{JSONRPC: "2.0", ID: request.ID}
	switch request.Method {
	case "initialize":
		response.Result = map[string]any{
			"protocolVersion": "2025-06-18",
			"capabilities": map[string]any{
				"tools":     map[string]any{},
				"resources": map[string]any{},
				"prompts":   map[string]any{},
			},
			"serverInfo": map[string]any{
				"name":    "openplane-cli-mcp",
				"version": "0.1.0",
			},
		}
		return response
	case "tools/list":
		return a.handleGet(ctx, request.ID, "/api/mcp/tools", nil)
	case "tools/call":
		name, _ := asString(request.Params["name"])
		args := asObject(request.Params["arguments"])
		path := buildPath("/api/mcp/tools", name, "call")
		return a.handlePost(ctx, request.ID, path, nil, map[string]any{"arguments": args})
	case "resources/list":
		return a.handleGet(ctx, request.ID, "/api/mcp/resources", nil)
	case "resources/read":
		uri, _ := asString(request.Params["uri"])
		path := buildPath("/api/mcp/resources", uri)
		return a.handleGet(ctx, request.ID, path, nil)
	case "prompts/list":
		return a.handleGet(ctx, request.ID, "/api/mcp/prompts", nil)
	case "prompts/get":
		name, _ := asString(request.Params["name"])
		args := asObject(request.Params["arguments"])
		path := buildPath("/api/mcp/prompts", name)
		query := url.Values{}
		if len(args) > 0 {
			encoded, _ := json.Marshal(args)
			query.Set("args", string(encoded))
		}
		return a.handleGet(ctx, request.ID, path, query)
	default:
		response.Error = &RPCError{Code: -32601, Message: fmt.Sprintf("method not found: %s", request.Method)}
		return response
	}
}

func (a *HTTPAdapter) handleGet(ctx context.Context, id any, path string, query url.Values) Response {
	result, err := a.get(ctx, path, query)
	if err != nil {
		return Response{JSONRPC: "2.0", ID: id, Error: &RPCError{Code: -32000, Message: err.Error()}}
	}
	return Response{JSONRPC: "2.0", ID: id, Result: result}
}

func (a *HTTPAdapter) handlePost(ctx context.Context, id any, path string, query url.Values, body any) Response {
	result, err := a.post(ctx, path, query, body)
	if err != nil {
		return Response{JSONRPC: "2.0", ID: id, Error: &RPCError{Code: -32000, Message: err.Error()}}
	}
	return Response{JSONRPC: "2.0", ID: id, Result: result}
}

func asString(value any) (string, bool) {
	str, ok := value.(string)
	return str, ok
}

func asObject(value any) map[string]any {
	object, ok := value.(map[string]any)
	if !ok {
		return map[string]any{}
	}
	return object
}

func buildPath(base string, segments ...string) string {
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
