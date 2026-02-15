package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"testing"
)

type stubHandler struct{}

func (stubHandler) Handle(_ context.Context, request Request) Response {
	return Response{
		JSONRPC: "2.0",
		ID:      request.ID,
		Result:  map[string]any{"ok": true, "method": request.Method},
	}
}

func TestServerServeHandlesRequest(t *testing.T) {
	in := bytes.NewBufferString(`{"jsonrpc":"2.0","id":1,"method":"tools/list"}` + "\n")
	out := bytes.NewBuffer(nil)
	server := &Server{
		In:      in,
		Out:     out,
		Handler: stubHandler{},
	}
	if err := server.Serve(context.Background()); err != nil {
		t.Fatal(err)
	}
	var response Response
	if err := json.Unmarshal(out.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response.Error != nil {
		t.Fatalf("unexpected error response: %+v", response.Error)
	}
	if response.ID != float64(1) {
		t.Fatalf("unexpected response id: %#v", response.ID)
	}
	result, ok := response.Result.(map[string]any)
	if !ok {
		t.Fatalf("unexpected result type: %T", response.Result)
	}
	if raw, ok := result["ok"].(bool); !ok || !raw {
		t.Fatalf("unexpected result payload: %#v", result)
	}
}

func TestServerServeParseError(t *testing.T) {
	in := bytes.NewBufferString("not-json\n")
	out := bytes.NewBuffer(nil)
	server := &Server{
		In:      in,
		Out:     out,
		Handler: stubHandler{},
	}
	if err := server.Serve(context.Background()); err != nil {
		t.Fatal(err)
	}
	var response Response
	if err := json.Unmarshal(out.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response.Error == nil {
		t.Fatal("expected parse error response")
	}
	if response.Error.Code != -32700 {
		t.Fatalf("unexpected parse error code: %d", response.Error.Code)
	}
}
