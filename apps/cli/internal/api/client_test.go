package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/openplane/openplane/apps/cli/internal/errs"
)

func TestRequestJSON_Headers(t *testing.T) {
	tests := []struct {
		name       string
		token      string
		team       string
		body       any
		wantAccept string
		wantCT     bool
		wantAuth   bool
		wantTeam   bool
	}{
		{
			name:       "GET with token and team sets all headers",
			token:      "tok_123",
			team:       "team_abc",
			body:       nil,
			wantAccept: "application/json",
			wantCT:     false,
			wantAuth:   true,
			wantTeam:   true,
		},
		{
			name:       "POST with body sets Content-Type",
			token:      "tok_123",
			team:       "",
			body:       map[string]any{"key": "value"},
			wantAccept: "application/json",
			wantCT:     true,
			wantAuth:   true,
			wantTeam:   false,
		},
		{
			name:       "empty token omits Authorization",
			token:      "",
			team:       "",
			body:       nil,
			wantAccept: "application/json",
			wantCT:     false,
			wantAuth:   false,
			wantTeam:   false,
		},
		{
			name:       "empty team omits X-Openplane-Team",
			token:      "tok_123",
			team:       "",
			body:       nil,
			wantAccept: "application/json",
			wantCT:     false,
			wantAuth:   true,
			wantTeam:   false,
		},
		{
			name:       "nil body omits Content-Type",
			token:      "",
			team:       "team_abc",
			body:       nil,
			wantAccept: "application/json",
			wantCT:     false,
			wantAuth:   false,
			wantTeam:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var captured http.Header
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				captured = r.Header.Clone()
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(`{}`))
			}))
			defer server.Close()

			client := NewClient(server.Client(), server.URL, tt.token)
			client.SetTeam(tt.team)

			if tt.body != nil {
				_, _, _ = client.PostJSON(context.Background(), "/test", nil, tt.body)
			} else {
				_, _, _ = client.GetJSON(context.Background(), "/test", nil)
			}

			if got := captured.Get("Accept"); got != tt.wantAccept {
				t.Fatalf("Accept header = %q, want %q", got, tt.wantAccept)
			}

			if got := captured.Get("User-Agent"); got != "openplane-cli/0.1.0" {
				t.Fatalf("User-Agent = %q, want %q", got, "openplane-cli/0.1.0")
			}

			if got := captured.Get("X-Request-ID"); got == "" {
				t.Fatal("X-Request-ID header missing")
			}

			if tt.wantCT {
				if got := captured.Get("Content-Type"); got != "application/json" {
					t.Fatalf("Content-Type = %q, want %q", got, "application/json")
				}
			} else {
				if got := captured.Get("Content-Type"); got != "" {
					t.Fatalf("Content-Type should be absent, got %q", got)
				}
			}

			if tt.wantAuth {
				if got := captured.Get("Authorization"); got != "Bearer "+tt.token {
					t.Fatalf("Authorization = %q, want %q", got, "Bearer "+tt.token)
				}
			} else {
				if got := captured.Get("Authorization"); got != "" {
					t.Fatalf("Authorization should be absent, got %q", got)
				}
			}

			if tt.wantTeam {
				if got := captured.Get("X-Openplane-Team"); got != tt.team {
					t.Fatalf("X-Openplane-Team = %q, want %q", got, tt.team)
				}
			} else {
				if got := captured.Get("X-Openplane-Team"); got != "" {
					t.Fatalf("X-Openplane-Team should be absent, got %q", got)
				}
			}
		})
	}
}

func TestGetJSON_SuccessfulResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("method = %s, want GET", r.Method)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("x-request-id", "resp-id-1")
		_, _ = w.Write([]byte(`{"name":"test","count":42}`))
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL, "token")
	value, meta, err := client.GetJSON(context.Background(), "/items", nil)
	if err != nil {
		t.Fatal(err)
	}

	obj, ok := value.(map[string]any)
	if !ok {
		t.Fatalf("expected map, got %T", value)
	}
	if obj["name"] != "test" {
		t.Fatalf("name = %v, want test", obj["name"])
	}
	if obj["count"] != float64(42) {
		t.Fatalf("count = %v, want 42", obj["count"])
	}
	if meta.RequestID != "resp-id-1" {
		t.Fatalf("meta.RequestID = %q, want %q", meta.RequestID, "resp-id-1")
	}
	if meta.DurationMS < 0 {
		t.Fatalf("meta.DurationMS = %d, want >= 0", meta.DurationMS)
	}
	if meta.Host != server.URL {
		t.Fatalf("meta.Host = %q, want %q", meta.Host, server.URL)
	}
}

func TestPostJSON_SendsBody(t *testing.T) {
	var received map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("method = %s, want POST", r.Method)
		}
		body, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(body, &received)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"created":true}`))
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL, "")
	payload := map[string]any{"title": "hello", "priority": float64(1)}
	value, _, err := client.PostJSON(context.Background(), "/items", nil, payload)
	if err != nil {
		t.Fatal(err)
	}

	if received["title"] != "hello" {
		t.Fatalf("received title = %v, want hello", received["title"])
	}
	if received["priority"] != float64(1) {
		t.Fatalf("received priority = %v, want 1", received["priority"])
	}

	obj, ok := value.(map[string]any)
	if !ok {
		t.Fatalf("expected map, got %T", value)
	}
	if obj["created"] != true {
		t.Fatalf("response created = %v, want true", obj["created"])
	}
}

func TestPatchJSON_UsesCorrectMethod(t *testing.T) {
	var capturedMethod string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedMethod = r.Method
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{}`))
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL, "")
	_, _, err := client.PatchJSON(context.Background(), "/items/1", nil, map[string]any{"name": "updated"})
	if err != nil {
		t.Fatal(err)
	}
	if capturedMethod != http.MethodPatch {
		t.Fatalf("method = %s, want PATCH", capturedMethod)
	}
}

func TestDeleteJSON_UsesCorrectMethod(t *testing.T) {
	var capturedMethod string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedMethod = r.Method
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{}`))
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL, "")
	_, _, err := client.DeleteJSON(context.Background(), "/items/1", nil)
	if err != nil {
		t.Fatal(err)
	}
	if capturedMethod != http.MethodDelete {
		t.Fatalf("method = %s, want DELETE", capturedMethod)
	}
}

func TestRequestJSON_HTTPStatusErrors(t *testing.T) {
	tests := []struct {
		name     string
		status   int
		body     string
		wantKind errs.Kind
	}{
		{
			name:     "400 returns KindUsage",
			status:   http.StatusBadRequest,
			body:     `{"error":"invalid input"}`,
			wantKind: errs.KindUsage,
		},
		{
			name:     "401 returns KindAuth",
			status:   http.StatusUnauthorized,
			body:     `{"message":"unauthorized"}`,
			wantKind: errs.KindAuth,
		},
		{
			name:     "403 returns KindForbidden",
			status:   http.StatusForbidden,
			body:     `{"error":"forbidden"}`,
			wantKind: errs.KindForbidden,
		},
		{
			name:     "404 returns KindNotFound",
			status:   http.StatusNotFound,
			body:     `{"error":"not found"}`,
			wantKind: errs.KindNotFound,
		},
		{
			name:     "409 returns KindConflict",
			status:   http.StatusConflict,
			body:     `{"error":"conflict"}`,
			wantKind: errs.KindConflict,
		},
		{
			name:     "429 returns KindRateLimited",
			status:   http.StatusTooManyRequests,
			body:     `{"error":"rate limited"}`,
			wantKind: errs.KindRateLimited,
		},
		{
			name:     "500 returns KindServer",
			status:   http.StatusInternalServerError,
			body:     `{"error":"internal error"}`,
			wantKind: errs.KindServer,
		},
		{
			name:     "502 returns KindServer",
			status:   http.StatusBadGateway,
			body:     `{"error":"bad gateway"}`,
			wantKind: errs.KindServer,
		},
		{
			name:     "non-json error body uses text as error message",
			status:   http.StatusBadRequest,
			body:     `plain error text`,
			wantKind: errs.KindUsage,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tt.status)
				_, _ = w.Write([]byte(tt.body))
			}))
			defer server.Close()

			client := NewClient(server.Client(), server.URL, "token")
			_, _, err := client.GetJSON(context.Background(), "/test", nil)

			if err == nil {
				t.Fatal("expected error")
			}
			if !errs.IsKind(err, tt.wantKind) {
				t.Fatalf("error kind = %v, want %v; error: %v", err, tt.wantKind, err)
			}
		})
	}
}

func TestRequestJSON_NetworkError(t *testing.T) {
	client := NewClient(http.DefaultClient, "http://127.0.0.1:1", "token")
	_, _, err := client.GetJSON(context.Background(), "/test", nil)

	if err == nil {
		t.Fatal("expected network error")
	}
}

func TestRequestJSON_MetadataIncludesDuration(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{}`))
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL, "")
	_, meta, err := client.GetJSON(context.Background(), "/test", nil)
	if err != nil {
		t.Fatal(err)
	}
	if meta.DurationMS < 0 {
		t.Fatalf("duration = %d, expected >= 0", meta.DurationMS)
	}
}

func TestRequestJSON_MetadataFallsBackToOutboundRequestID(t *testing.T) {
	var outboundID string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		outboundID = r.Header.Get("X-Request-ID")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{}`))
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL, "")
	_, meta, err := client.GetJSON(context.Background(), "/test", nil)
	if err != nil {
		t.Fatal(err)
	}
	if meta.RequestID != outboundID {
		t.Fatalf("meta.RequestID = %q, want outbound %q", meta.RequestID, outboundID)
	}
}

func TestRequestJSON_MetadataUsesServerRequestID(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("x-request-id", "from-server")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{}`))
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL, "")
	_, meta, err := client.GetJSON(context.Background(), "/test", nil)
	if err != nil {
		t.Fatal(err)
	}
	if meta.RequestID != "from-server" {
		t.Fatalf("meta.RequestID = %q, want %q", meta.RequestID, "from-server")
	}
}

func TestResolveURL(t *testing.T) {
	client := NewClient(http.DefaultClient, "https://api.example.com", "")

	tests := []struct {
		name    string
		path    string
		query   url.Values
		want    string
		wantErr bool
	}{
		{
			name:  "relative path gets baseURL prefix",
			path:  "/v1/items",
			query: nil,
			want:  "https://api.example.com/v1/items",
		},
		{
			name:  "relative path without leading slash gets normalized",
			path:  "v1/items",
			query: nil,
			want:  "https://api.example.com/v1/items",
		},
		{
			name:  "absolute HTTP URL used as-is",
			path:  "https://other.example.com/v1/items",
			query: nil,
			want:  "https://other.example.com/v1/items",
		},
		{
			name:  "absolute HTTP URL (http) used as-is",
			path:  "http://localhost:3000/health",
			query: nil,
			want:  "http://localhost:3000/health",
		},
		{
			name:  "query parameters appended to relative path",
			path:  "/v1/search",
			query: url.Values{"q": {"hello"}, "limit": {"10"}},
			want:  "https://api.example.com/v1/search?limit=10&q=hello",
		},
		{
			name:  "query parameters appended to absolute URL",
			path:  "https://other.example.com/items",
			query: url.Values{"page": {"2"}},
			want:  "https://other.example.com/items?page=2",
		},
		{
			name:  "multiple leading slashes trimmed",
			path:  "///v1/items",
			query: nil,
			want:  "https://api.example.com/v1/items",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := client.resolveURL(tt.path, tt.query)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if got != tt.want {
				t.Fatalf("resolveURL(%q, %v) = %q, want %q", tt.path, tt.query, got, tt.want)
			}
		})
	}
}

func TestResolveURL_BaseURLTrailingSlashTrimmed(t *testing.T) {
	client := NewClient(http.DefaultClient, "https://api.example.com/", "")
	got, err := client.resolveURL("/v1/items", nil)
	if err != nil {
		t.Fatal(err)
	}
	if got != "https://api.example.com/v1/items" {
		t.Fatalf("got %q, want no double slash", got)
	}
}

func TestParseJSONOrText(t *testing.T) {
	tests := []struct {
		name     string
		payload  string
		wantType string
	}{
		{
			name:     "valid JSON object parsed correctly",
			payload:  `{"ok":true,"count":5}`,
			wantType: "map",
		},
		{
			name:     "valid JSON array parsed correctly",
			payload:  `[1,2,3]`,
			wantType: "slice",
		},
		{
			name:     "non-JSON returns trimmed string",
			payload:  "  plain text  ",
			wantType: "string",
		},
		{
			name:     "empty string returns empty map",
			payload:  "",
			wantType: "emptymap",
		},
		{
			name:     "whitespace-only returns empty map",
			payload:  "   ",
			wantType: "emptymap",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			value := parseJSONOrText([]byte(tt.payload))
			switch tt.wantType {
			case "map":
				obj, ok := value.(map[string]any)
				if !ok {
					t.Fatalf("expected map, got %T", value)
				}
				if obj["ok"] != true {
					t.Fatalf("expected ok=true, got %v", obj["ok"])
				}
			case "slice":
				arr, ok := value.([]any)
				if !ok {
					t.Fatalf("expected slice, got %T", value)
				}
				if len(arr) != 3 {
					t.Fatalf("expected 3 items, got %d", len(arr))
				}
			case "string":
				str, ok := value.(string)
				if !ok {
					t.Fatalf("expected string, got %T", value)
				}
				if str != "plain text" {
					t.Fatalf("expected trimmed string, got %q", str)
				}
			case "emptymap":
				obj, ok := value.(map[string]any)
				if !ok {
					t.Fatalf("expected empty map, got %T", value)
				}
				if len(obj) != 0 {
					t.Fatalf("expected empty map, got %v", obj)
				}
			}
		})
	}
}

func TestEncodeArgsJSON(t *testing.T) {
	tests := []struct {
		name    string
		raw     string
		want    string
		wantErr bool
	}{
		{
			name: "valid JSON passes through",
			raw:  `{"z":1,"a":"x"}`,
			want: "", // accept any valid re-encoding
		},
		{
			name: "empty string returns empty object",
			raw:  "",
			want: "{}",
		},
		{
			name: "whitespace-only returns empty object",
			raw:  "   ",
			want: "{}",
		},
		{
			name:    "invalid JSON returns error",
			raw:     "{broken",
			wantErr: true,
		},
		{
			name:    "incomplete array returns error",
			raw:     "[1,2,",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := EncodeArgsJSON(tt.raw)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if tt.want == "" {
				var parsed any
				if err := json.Unmarshal([]byte(got), &parsed); err != nil {
					t.Fatalf("result is not valid JSON: %s", got)
				}
				return
			}
			if got != tt.want {
				t.Fatalf("EncodeArgsJSON(%q) = %q, want %q", tt.raw, got, tt.want)
			}
		})
	}
}

func TestMustObject(t *testing.T) {
	tests := []struct {
		name    string
		value   any
		wantErr bool
	}{
		{
			name:    "map returns successfully",
			value:   map[string]any{"key": "value"},
			wantErr: false,
		},
		{
			name:    "string returns error",
			value:   "not a map",
			wantErr: true,
		},
		{
			name:    "slice returns error",
			value:   []any{1, 2, 3},
			wantErr: true,
		},
		{
			name:    "nil returns error",
			value:   nil,
			wantErr: true,
		},
		{
			name:    "float64 returns error",
			value:   42.0,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			obj, err := MustObject(tt.value)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if obj["key"] != "value" {
				t.Fatalf("key = %v, want value", obj["key"])
			}
		})
	}
}

func TestSetTeam_TrimsWhitespace(t *testing.T) {
	tests := []struct {
		name string
		team string
		want string
	}{
		{name: "no whitespace", team: "myteam", want: "myteam"},
		{name: "leading whitespace", team: "  myteam", want: "myteam"},
		{name: "trailing whitespace", team: "myteam  ", want: "myteam"},
		{name: "both sides", team: "  myteam  ", want: "myteam"},
		{name: "empty string", team: "", want: ""},
		{name: "whitespace-only becomes empty", team: "   ", want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var capturedTeam string
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				capturedTeam = r.Header.Get("X-Openplane-Team")
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(`{}`))
			}))
			defer server.Close()

			client := NewClient(server.Client(), server.URL, "token")
			client.SetTeam(tt.team)
			_, _, _ = client.GetJSON(context.Background(), "/test", nil)

			if tt.want == "" {
				if capturedTeam != "" {
					t.Fatalf("expected no team header, got %q", capturedTeam)
				}
			} else {
				if capturedTeam != tt.want {
					t.Fatalf("team header = %q, want %q", capturedTeam, tt.want)
				}
			}
		})
	}
}

func TestSetTrace_WritesToWriter(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{}`))
	}))
	defer server.Close()

	buf := &bytes.Buffer{}
	client := NewClient(server.Client(), server.URL, "")
	client.SetTrace(true, buf)

	_, _, _ = client.GetJSON(context.Background(), "/test", nil)

	output := buf.String()
	if !strings.Contains(output, "->") {
		t.Fatalf("trace output missing request line: %q", output)
	}
	if !strings.Contains(output, "<-") {
		t.Fatalf("trace output missing response line: %q", output)
	}
}

func TestSetTrace_DisabledDoesNotWrite(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{}`))
	}))
	defer server.Close()

	buf := &bytes.Buffer{}
	client := NewClient(server.Client(), server.URL, "")
	client.SetTrace(false, buf)

	_, _, _ = client.GetJSON(context.Background(), "/test", nil)

	if buf.Len() != 0 {
		t.Fatalf("expected no trace output, got %q", buf.String())
	}
}

func TestStreamSSE_ParsesEvents(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprint(w, "event: message\ndata: hello world\n\n")
		_, _ = fmt.Fprint(w, "event: done\ndata: finished\n\n")
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL, "")
	var events []SSEEvent
	err := client.StreamSSE(context.Background(), "/stream", nil, nil, func(e SSEEvent) error {
		events = append(events, e)
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(events))
	}
	if events[0].Event != "message" || events[0].Data != "hello world" {
		t.Fatalf("event[0] = %+v, want event=message data=hello world", events[0])
	}
	if events[1].Event != "done" || events[1].Data != "finished" {
		t.Fatalf("event[1] = %+v, want event=done data=finished", events[1])
	}
}

func TestStreamSSE_MultiLineData(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprint(w, "event: chunk\ndata: line one\ndata: line two\ndata: line three\n\n")
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL, "")
	var events []SSEEvent
	err := client.StreamSSE(context.Background(), "/stream", nil, nil, func(e SSEEvent) error {
		events = append(events, e)
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].Data != "line one\nline two\nline three" {
		t.Fatalf("multi-line data = %q, want joined lines", events[0].Data)
	}
}

func TestStreamSSE_SkipsEmptyDataEvents(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprint(w, "event: heartbeat\n\n")
		_, _ = fmt.Fprint(w, "event: message\ndata: real data\n\n")
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL, "")
	var events []SSEEvent
	err := client.StreamSSE(context.Background(), "/stream", nil, nil, func(e SSEEvent) error {
		events = append(events, e)
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 event (heartbeat skipped), got %d", len(events))
	}
	if events[0].Event != "message" {
		t.Fatalf("event type = %q, want message", events[0].Event)
	}
}

func TestStreamSSE_FlushesTrailingEvent(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprint(w, "event: final\ndata: no trailing newline")
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL, "")
	var events []SSEEvent
	err := client.StreamSSE(context.Background(), "/stream", nil, nil, func(e SSEEvent) error {
		events = append(events, e)
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 trailing event, got %d", len(events))
	}
	if events[0].Data != "no trailing newline" {
		t.Fatalf("trailing data = %q", events[0].Data)
	}
}

func TestStreamSSE_HTTPErrorReturnsError(t *testing.T) {
	tests := []struct {
		name     string
		status   int
		body     string
		wantKind errs.Kind
	}{
		{
			name:     "401 returns auth error",
			status:   http.StatusUnauthorized,
			body:     `{"error":"unauthorized"}`,
			wantKind: errs.KindAuth,
		},
		{
			name:     "500 returns server error",
			status:   http.StatusInternalServerError,
			body:     `{"error":"server error"}`,
			wantKind: errs.KindServer,
		},
		{
			name:     "404 with plain text",
			status:   http.StatusNotFound,
			body:     `not found`,
			wantKind: errs.KindNotFound,
		},
		{
			name:     "400 with empty body",
			status:   http.StatusBadRequest,
			body:     ``,
			wantKind: errs.KindUsage,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tt.status)
				_, _ = w.Write([]byte(tt.body))
			}))
			defer server.Close()

			client := NewClient(server.Client(), server.URL, "")
			err := client.StreamSSE(context.Background(), "/stream", nil, nil, func(e SSEEvent) error {
				t.Fatal("handler should not be called on error")
				return nil
			})

			if err == nil {
				t.Fatal("expected error")
			}
			if !errs.IsKind(err, tt.wantKind) {
				t.Fatalf("error kind mismatch: got %v, want %v", err, tt.wantKind)
			}
		})
	}
}

func TestStreamSSE_HandlerErrorStopsProcessing(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprint(w, "event: a\ndata: first\n\n")
		_, _ = fmt.Fprint(w, "event: b\ndata: second\n\n")
	}))
	defer server.Close()

	handlerErr := fmt.Errorf("stop processing")
	client := NewClient(server.Client(), server.URL, "")
	callCount := 0
	err := client.StreamSSE(context.Background(), "/stream", nil, nil, func(e SSEEvent) error {
		callCount++
		return handlerErr
	})

	if err != handlerErr {
		t.Fatalf("expected handler error, got %v", err)
	}
	if callCount != 1 {
		t.Fatalf("handler called %d times, want 1", callCount)
	}
}

func TestStreamSSE_SendsBody(t *testing.T) {
	var receivedBody map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(raw, &receivedBody)
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprint(w, "event: ok\ndata: done\n\n")
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL, "")
	err := client.StreamSSE(context.Background(), "/stream", nil, map[string]any{"prompt": "hello"}, func(e SSEEvent) error {
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if receivedBody["prompt"] != "hello" {
		t.Fatalf("body prompt = %v, want hello", receivedBody["prompt"])
	}
}

func TestStreamSSE_SetsCorrectHeaders(t *testing.T) {
	var captured http.Header
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		captured = r.Header.Clone()
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL, "tok_abc")
	client.SetTeam("team_xyz")
	_ = client.StreamSSE(context.Background(), "/stream", nil, nil, func(e SSEEvent) error {
		return nil
	})

	if got := captured.Get("Accept"); got != "text/event-stream" {
		t.Fatalf("Accept = %q, want text/event-stream", got)
	}
	if got := captured.Get("Cache-Control"); got != "no-cache" {
		t.Fatalf("Cache-Control = %q, want no-cache", got)
	}
	if got := captured.Get("Authorization"); got != "Bearer tok_abc" {
		t.Fatalf("Authorization = %q, want Bearer tok_abc", got)
	}
	if got := captured.Get("X-Openplane-Team"); got != "team_xyz" {
		t.Fatalf("X-Openplane-Team = %q, want team_xyz", got)
	}
	if got := captured.Get("X-Request-ID"); got == "" {
		t.Fatal("X-Request-ID missing")
	}
}

func TestStreamSSE_ConnectionError(t *testing.T) {
	client := NewClient(http.DefaultClient, "http://127.0.0.1:1", "")
	err := client.StreamSSE(context.Background(), "/stream", nil, nil, func(e SSEEvent) error {
		return nil
	})
	if err == nil {
		t.Fatal("expected connection error")
	}
}

func TestGetJSON_QueryParameters(t *testing.T) {
	var capturedQuery url.Values
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedQuery = r.URL.Query()
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{}`))
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL, "")
	q := url.Values{"search": {"hello"}, "limit": {"20"}}
	_, _, err := client.GetJSON(context.Background(), "/items", q)
	if err != nil {
		t.Fatal(err)
	}
	if capturedQuery.Get("search") != "hello" {
		t.Fatalf("search = %q, want hello", capturedQuery.Get("search"))
	}
	if capturedQuery.Get("limit") != "20" {
		t.Fatalf("limit = %q, want 20", capturedQuery.Get("limit"))
	}
}
