package output

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"
)

func TestFormat_IsValid(t *testing.T) {
	tests := []struct {
		name   string
		format Format
		want   bool
	}{
		{name: "table is valid", format: FormatTable, want: true},
		{name: "json is valid", format: FormatJSON, want: true},
		{name: "yaml is valid", format: FormatYAML, want: true},
		{name: "ndjson is valid", format: FormatNDJSON, want: true},
		{name: "empty is invalid", format: "", want: false},
		{name: "unknown is invalid", format: "xml", want: false},
		{name: "csv is invalid", format: "csv", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.format.IsValid(); got != tt.want {
				t.Fatalf("Format(%q).IsValid() = %v, want %v", tt.format, got, tt.want)
			}
		})
	}
}

func TestFormat_SupportsTransform(t *testing.T) {
	tests := []struct {
		name   string
		format Format
		want   bool
	}{
		{name: "table does not support transform", format: FormatTable, want: false},
		{name: "json supports transform", format: FormatJSON, want: true},
		{name: "yaml supports transform", format: FormatYAML, want: true},
		{name: "ndjson supports transform", format: FormatNDJSON, want: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.format.SupportsTransform(); got != tt.want {
				t.Fatalf("Format(%q).SupportsTransform() = %v, want %v", tt.format, got, tt.want)
			}
		})
	}
}

func TestRenderJSON_ValidOutput(t *testing.T) {
	tests := []struct {
		name  string
		value any
		check func(t *testing.T, output string)
	}{
		{
			name:  "renders object with indentation",
			value: map[string]any{"ok": true, "count": float64(3)},
			check: func(t *testing.T, output string) {
				if !strings.Contains(output, "\"ok\": true") {
					t.Fatalf("missing ok field: %s", output)
				}
				if !strings.Contains(output, "\"count\": 3") {
					t.Fatalf("missing count field: %s", output)
				}
				if !strings.Contains(output, "  ") {
					t.Fatalf("missing indentation: %s", output)
				}
			},
		},
		{
			name:  "renders nested objects",
			value: map[string]any{"user": map[string]any{"name": "alice", "role": "admin"}},
			check: func(t *testing.T, output string) {
				if !strings.Contains(output, "\"name\": \"alice\"") {
					t.Fatalf("missing nested name: %s", output)
				}
				if !strings.Contains(output, "\"role\": \"admin\"") {
					t.Fatalf("missing nested role: %s", output)
				}
			},
		},
		{
			name:  "renders arrays",
			value: []any{"alpha", "beta", "gamma"},
			check: func(t *testing.T, output string) {
				if !strings.Contains(output, "\"alpha\"") {
					t.Fatalf("missing alpha: %s", output)
				}
				if !strings.Contains(output, "\"gamma\"") {
					t.Fatalf("missing gamma: %s", output)
				}
				var parsed []any
				if err := json.Unmarshal([]byte(output), &parsed); err != nil {
					t.Fatalf("output is not valid JSON: %s", output)
				}
				if len(parsed) != 3 {
					t.Fatalf("expected 3 items, got %d", len(parsed))
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			buf := &bytes.Buffer{}
			if err := Render(buf, tt.value, Options{Format: FormatJSON}); err != nil {
				t.Fatal(err)
			}
			tt.check(t, buf.String())
		})
	}
}

func TestRenderYAML_ValidOutput(t *testing.T) {
	buf := &bytes.Buffer{}
	value := map[string]any{"name": "test", "active": true, "count": float64(5)}
	if err := Render(buf, value, Options{Format: FormatYAML}); err != nil {
		t.Fatal(err)
	}
	out := buf.String()
	if !strings.Contains(out, "name: test") {
		t.Fatalf("missing name field: %s", out)
	}
	if !strings.Contains(out, "active: true") {
		t.Fatalf("missing active field: %s", out)
	}
	if !strings.Contains(out, "count: 5") {
		t.Fatalf("missing count field: %s", out)
	}
}

func TestRenderNDJSON_ArrayItems(t *testing.T) {
	buf := &bytes.Buffer{}
	value := []any{
		map[string]any{"id": "1", "name": "alpha"},
		map[string]any{"id": "2", "name": "beta"},
		map[string]any{"id": "3", "name": "gamma"},
	}
	if err := Render(buf, value, Options{Format: FormatNDJSON}); err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(strings.TrimSpace(buf.String()), "\n")
	if len(lines) != 3 {
		t.Fatalf("expected 3 lines, got %d", len(lines))
	}
	for _, line := range lines {
		var obj map[string]any
		if err := json.Unmarshal([]byte(line), &obj); err != nil {
			t.Fatalf("line is not valid JSON: %s", line)
		}
	}
}

func TestRenderNDJSON_SingleObject(t *testing.T) {
	buf := &bytes.Buffer{}
	value := map[string]any{"id": "single"}
	if err := Render(buf, value, Options{Format: FormatNDJSON}); err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(strings.TrimSpace(buf.String()), "\n")
	if len(lines) != 1 {
		t.Fatalf("expected 1 line, got %d", len(lines))
	}
	var obj map[string]any
	if err := json.Unmarshal([]byte(lines[0]), &obj); err != nil {
		t.Fatalf("not valid JSON: %s", lines[0])
	}
	if obj["id"] != "single" {
		t.Fatalf("id = %v, want single", obj["id"])
	}
}

func TestRenderTable_FormattedOutput(t *testing.T) {
	buf := &bytes.Buffer{}
	value := map[string]any{
		"items": []any{
			map[string]any{"id": "1", "name": "alpha"},
			map[string]any{"id": "2", "name": "beta"},
		},
	}
	if err := Render(buf, value, Options{Format: FormatTable}); err != nil {
		t.Fatal(err)
	}
	out := buf.String()
	if !strings.Contains(out, "ID") {
		t.Fatalf("missing ID header: %s", out)
	}
	if !strings.Contains(out, "NAME") {
		t.Fatalf("missing NAME header: %s", out)
	}
	if !strings.Contains(out, "alpha") {
		t.Fatalf("missing alpha value: %s", out)
	}
	if !strings.Contains(out, "beta") {
		t.Fatalf("missing beta value: %s", out)
	}
}

func TestRenderTable_ExtractsFromWrapperKeys(t *testing.T) {
	wrapperKeys := []string{"items", "results", "documents", "history", "tools", "resources", "prompts", "drivers", "points", "spreadsheets", "rows", "media"}
	for _, key := range wrapperKeys {
		t.Run(key, func(t *testing.T) {
			buf := &bytes.Buffer{}
			value := map[string]any{
				key: []any{
					map[string]any{"id": "1"},
				},
			}
			if err := Render(buf, value, Options{Format: FormatTable}); err != nil {
				t.Fatal(err)
			}
			out := buf.String()
			if !strings.Contains(out, "ID") {
				t.Fatalf("wrapper key %q: missing ID header in output: %s", key, out)
			}
		})
	}
}

func TestRenderTable_DirectArray(t *testing.T) {
	buf := &bytes.Buffer{}
	value := []any{
		map[string]any{"name": "first"},
		map[string]any{"name": "second"},
	}
	if err := Render(buf, value, Options{Format: FormatTable}); err != nil {
		t.Fatal(err)
	}
	out := buf.String()
	if !strings.Contains(out, "NAME") {
		t.Fatalf("missing NAME header: %s", out)
	}
	if !strings.Contains(out, "first") {
		t.Fatalf("missing first: %s", out)
	}
}

func TestRenderTable_SingleObjectFallback(t *testing.T) {
	buf := &bytes.Buffer{}
	value := map[string]any{"id": "solo", "status": "active"}
	if err := Render(buf, value, Options{Format: FormatTable}); err != nil {
		t.Fatal(err)
	}
	out := buf.String()
	if !strings.Contains(out, "ID") {
		t.Fatalf("missing ID header: %s", out)
	}
	if !strings.Contains(out, "solo") {
		t.Fatalf("missing solo value: %s", out)
	}
}

func TestRenderTable_NonArrayFallsBackToJSON(t *testing.T) {
	buf := &bytes.Buffer{}
	value := "just a string"
	if err := Render(buf, value, Options{Format: FormatTable}); err != nil {
		t.Fatal(err)
	}
	out := buf.String()
	if !strings.Contains(out, "just a string") {
		t.Fatalf("expected string fallback to JSON: %s", out)
	}
}

func TestApplyJQ_FieldExtraction(t *testing.T) {
	buf := &bytes.Buffer{}
	value := map[string]any{"name": "test", "count": float64(42)}
	err := Render(buf, value, Options{Format: FormatJSON, JQ: ".name"})
	if err != nil {
		t.Fatal(err)
	}
	out := strings.TrimSpace(buf.String())
	if out != `"test"` {
		t.Fatalf("jq .name = %q, want \"test\"", out)
	}
}

func TestApplyJQ_ArrayFiltering(t *testing.T) {
	buf := &bytes.Buffer{}
	value := map[string]any{
		"items": []any{
			map[string]any{"id": float64(1), "active": true},
			map[string]any{"id": float64(2), "active": false},
			map[string]any{"id": float64(3), "active": true},
		},
	}
	err := Render(buf, value, Options{Format: FormatJSON, JQ: "[.items[] | select(.active)]"})
	if err != nil {
		t.Fatal(err)
	}
	var result []any
	if err := json.Unmarshal(buf.Bytes(), &result); err != nil {
		t.Fatalf("output is not valid JSON: %s", buf.String())
	}
	if len(result) != 2 {
		t.Fatalf("expected 2 active items, got %d", len(result))
	}
}

func TestApplyJQ_InvalidExpression(t *testing.T) {
	buf := &bytes.Buffer{}
	err := Render(buf, map[string]any{}, Options{Format: FormatJSON, JQ: ".["})
	if err == nil {
		t.Fatal("expected error for invalid jq expression")
	}
}

func TestApplyTemplate_GoTemplateRendering(t *testing.T) {
	buf := &bytes.Buffer{}
	value := map[string]any{"name": "world", "count": float64(7)}
	err := Render(buf, value, Options{Format: FormatJSON, Template: "Hello {{.name}} ({{.count}})"})
	if err != nil {
		t.Fatal(err)
	}
	out := strings.TrimSpace(buf.String())
	if out != `"Hello world (7)"` {
		t.Fatalf("template output = %s, want \"Hello world (7)\"", out)
	}
}

func TestApplyTemplate_SyntaxError(t *testing.T) {
	buf := &bytes.Buffer{}
	err := Render(buf, map[string]any{}, Options{Format: FormatJSON, Template: "{{.bad"})
	if err == nil {
		t.Fatal("expected template syntax error")
	}
}

func TestExtractTable_KnownWrapperKeys(t *testing.T) {
	for _, key := range []string{"items", "results", "documents", "history"} {
		t.Run(key, func(t *testing.T) {
			value := map[string]any{
				key: []any{map[string]any{"id": "1"}},
			}
			rows, columns, ok := extractTable(value)
			if !ok {
				t.Fatal("expected extraction to succeed")
			}
			if len(rows) != 1 {
				t.Fatalf("expected 1 row, got %d", len(rows))
			}
			if len(columns) != 1 || columns[0] != "id" {
				t.Fatalf("columns = %v, want [id]", columns)
			}
		})
	}
}

func TestExtractTable_NoWrapperFound(t *testing.T) {
	value := map[string]any{"unknown_key": []any{map[string]any{"id": "1"}}}
	rows, columns, ok := extractTable(value)
	if !ok {
		t.Fatal("single map should still extract as table row")
	}
	if len(rows) != 1 {
		t.Fatalf("expected 1 row (the map itself), got %d", len(rows))
	}
	found := false
	for _, col := range columns {
		if col == "unknown_key" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected unknown_key column, got %v", columns)
	}
}

func TestExtractTable_NonMapInput(t *testing.T) {
	_, _, ok := extractTable("not a map or slice")
	if ok {
		t.Fatal("expected extraction to fail for string")
	}

	_, _, ok = extractTable(float64(42))
	if ok {
		t.Fatal("expected extraction to fail for number")
	}

	_, _, ok = extractTable(nil)
	if ok {
		t.Fatal("expected extraction to fail for nil")
	}
}

func TestExtractTable_DirectArrayOfObjects(t *testing.T) {
	value := []any{
		map[string]any{"a": "1", "b": "2"},
		map[string]any{"a": "3", "b": "4"},
	}
	rows, columns, ok := extractTable(value)
	if !ok {
		t.Fatal("expected extraction to succeed")
	}
	if len(rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(rows))
	}
	if len(columns) != 2 {
		t.Fatalf("expected 2 columns, got %d", len(columns))
	}
}

func TestExtractTable_EmptyArray(t *testing.T) {
	_, _, ok := extractTable([]any{})
	if ok {
		t.Fatal("expected extraction to fail for empty array")
	}
}

func TestExtractTable_NonObjectArray(t *testing.T) {
	_, _, ok := extractTable([]any{"string1", "string2"})
	if ok {
		t.Fatal("expected extraction to fail for non-object array")
	}
}

func TestStringify(t *testing.T) {
	tests := []struct {
		name  string
		value any
		want  string
	}{
		{name: "string passthrough", value: "hello", want: "hello"},
		{name: "integer float64", value: float64(42), want: "42"},
		{name: "fractional float64", value: float64(3.14), want: "3.14"},
		{name: "true boolean", value: true, want: "true"},
		{name: "false boolean", value: false, want: "false"},
		{name: "nil shows empty", value: nil, want: ""},
		{name: "map shows JSON", value: map[string]any{"k": "v"}, want: `{"k":"v"}`},
		{name: "slice shows JSON", value: []any{1, 2}, want: `[1,2]`},
		{name: "zero float64", value: float64(0), want: "0"},
		{name: "negative integer float64", value: float64(-10), want: "-10"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := stringify(tt.value)
			if got != tt.want {
				t.Fatalf("stringify(%v) = %q, want %q", tt.value, got, tt.want)
			}
		})
	}
}

func TestRender_JQThenTemplate(t *testing.T) {
	buf := &bytes.Buffer{}
	value := map[string]any{"items": []any{float64(1), float64(2), float64(3)}}
	err := Render(buf, value, Options{
		Format:   FormatJSON,
		JQ:       ".items | length",
		Template: "Total: {{.}}",
	})
	if err != nil {
		t.Fatal(err)
	}
	out := strings.TrimSpace(buf.String())
	if out != `"Total: 3"` {
		t.Fatalf("combined transform = %s, want \"Total: 3\"", out)
	}
}

func TestRenderTable_ColumnsAreSorted(t *testing.T) {
	buf := &bytes.Buffer{}
	value := []any{
		map[string]any{"zebra": "z", "alpha": "a", "middle": "m"},
	}
	if err := Render(buf, value, Options{Format: FormatTable}); err != nil {
		t.Fatal(err)
	}
	out := buf.String()
	lines := strings.Split(out, "\n")
	if len(lines) < 1 {
		t.Fatal("expected at least 1 line")
	}
	header := lines[0]
	alphaIdx := strings.Index(header, "ALPHA")
	middleIdx := strings.Index(header, "MIDDLE")
	zebraIdx := strings.Index(header, "ZEBRA")
	if alphaIdx == -1 || middleIdx == -1 || zebraIdx == -1 {
		t.Fatalf("missing column headers: %s", header)
	}
	if alphaIdx >= middleIdx || middleIdx >= zebraIdx {
		t.Fatalf("columns not sorted: alpha=%d middle=%d zebra=%d", alphaIdx, middleIdx, zebraIdx)
	}
}

func TestRenderTable_MixedColumnRows(t *testing.T) {
	buf := &bytes.Buffer{}
	value := []any{
		map[string]any{"id": "1", "name": "alice"},
		map[string]any{"id": "2", "email": "bob@test.com"},
	}
	if err := Render(buf, value, Options{Format: FormatTable}); err != nil {
		t.Fatal(err)
	}
	out := buf.String()
	if !strings.Contains(out, "EMAIL") {
		t.Fatalf("missing EMAIL column: %s", out)
	}
	if !strings.Contains(out, "NAME") {
		t.Fatalf("missing NAME column: %s", out)
	}
}

func TestRenderNDJSON_EmptyArray(t *testing.T) {
	buf := &bytes.Buffer{}
	value := []any{}
	if err := Render(buf, value, Options{Format: FormatNDJSON}); err != nil {
		t.Fatal(err)
	}
	if buf.Len() != 0 {
		t.Fatalf("expected empty output for empty array, got %q", buf.String())
	}
}

func TestEnvelope_Structure(t *testing.T) {
	env := Envelope{
		SchemaVersion: "1.0",
		Command:       "connectors list",
		Result:        map[string]any{"items": []any{}},
	}
	encoded, err := json.Marshal(env)
	if err != nil {
		t.Fatal(err)
	}
	var parsed map[string]any
	if err := json.Unmarshal(encoded, &parsed); err != nil {
		t.Fatal(err)
	}
	if parsed["schema_version"] != "1.0" {
		t.Fatalf("schema_version = %v, want 1.0", parsed["schema_version"])
	}
	if parsed["command"] != "connectors list" {
		t.Fatalf("command = %v, want connectors list", parsed["command"])
	}
	if _, ok := parsed["result"]; !ok {
		t.Fatal("missing result field")
	}
	if _, ok := parsed["meta"]; !ok {
		t.Fatal("missing meta field")
	}
}

func TestRenderJSON_SpecialCharactersNotEscaped(t *testing.T) {
	buf := &bytes.Buffer{}
	value := map[string]any{"url": "https://example.com/search?q=test&page=1"}
	if err := Render(buf, value, Options{Format: FormatJSON}); err != nil {
		t.Fatal(err)
	}
	out := buf.String()
	if strings.Contains(out, "\\u0026") {
		t.Fatalf("HTML escaping should be disabled: %s", out)
	}
	if !strings.Contains(out, "&page=1") {
		t.Fatalf("ampersand should be preserved: %s", out)
	}
}
