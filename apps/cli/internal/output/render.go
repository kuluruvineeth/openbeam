package output

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"sort"
	"strings"
	"text/tabwriter"
	"text/template"

	"github.com/itchyny/gojq"
	"go.yaml.in/yaml/v3"
)

func Render(w io.Writer, value any, options Options) error {
	resolved, err := applyTransforms(value, options)
	if err != nil {
		return err
	}
	switch options.Format {
	case FormatJSON:
		return renderJSON(w, resolved)
	case FormatYAML:
		return renderYAML(w, resolved)
	case FormatNDJSON:
		return renderNDJSON(w, resolved)
	default:
		return renderTable(w, resolved)
	}
}

func applyTransforms(value any, options Options) (any, error) {
	resolved := value
	if options.JQ != "" {
		next, err := applyJQ(resolved, options.JQ)
		if err != nil {
			return nil, err
		}
		resolved = next
	}
	if options.Template != "" {
		next, err := applyTemplate(resolved, options.Template)
		if err != nil {
			return nil, err
		}
		resolved = next
	}
	return resolved, nil
}

func renderJSON(w io.Writer, value any) error {
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	return enc.Encode(value)
}

func renderYAML(w io.Writer, value any) error {
	enc := yaml.NewEncoder(w)
	defer func() { _ = enc.Close() }()
	return enc.Encode(value)
}

func renderNDJSON(w io.Writer, value any) error {
	items := toItemSlice(value)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	for _, item := range items {
		if err := enc.Encode(item); err != nil {
			return err
		}
	}
	return nil
}

func renderTable(w io.Writer, value any) error {
	rows, columns, ok := extractTable(value)
	if !ok {
		return renderJSON(w, value)
	}
	tw := tabwriter.NewWriter(w, 2, 4, 2, ' ', 0)
	for i, column := range columns {
		if i > 0 {
			_, _ = fmt.Fprint(tw, "\t")
		}
		_, _ = fmt.Fprint(tw, strings.ToUpper(column))
	}
	_, _ = fmt.Fprint(tw, "\n")
	for _, row := range rows {
		for i, column := range columns {
			if i > 0 {
				_, _ = fmt.Fprint(tw, "\t")
			}
			_, _ = fmt.Fprint(tw, stringify(row[column]))
		}
		_, _ = fmt.Fprint(tw, "\n")
	}
	return tw.Flush()
}

func applyJQ(value any, queryText string) (any, error) {
	query, err := gojq.Parse(queryText)
	if err != nil {
		return nil, err
	}
	iter := query.Run(value)
	results := make([]any, 0)
	for {
		next, ok := iter.Next()
		if !ok {
			break
		}
		if err, ok := next.(error); ok {
			return nil, err
		}
		results = append(results, next)
	}
	if len(results) == 1 {
		return results[0], nil
	}
	return results, nil
}

func applyTemplate(value any, tpl string) (any, error) {
	t, err := template.New("output").Parse(tpl)
	if err != nil {
		return nil, err
	}
	buf := bytes.NewBuffer(nil)
	if err := t.Execute(buf, value); err != nil {
		return nil, err
	}
	return strings.TrimSpace(buf.String()), nil
}

func toItemSlice(value any) []any {
	if list, ok := value.([]any); ok {
		return list
	}
	return []any{value}
}

func extractTable(value any) ([]map[string]any, []string, bool) {
	switch typed := value.(type) {
	case []any:
		rows, ok := toObjectRows(typed)
		if !ok || len(rows) == 0 {
			return nil, nil, false
		}
		columns := collectColumns(rows)
		return rows, columns, true
	case map[string]any:
		for _, key := range []string{"items", "results", "documents", "history", "tools", "resources", "prompts", "drivers", "points", "spreadsheets", "rows", "media"} {
			raw, ok := typed[key]
			if !ok {
				continue
			}
			list, ok := raw.([]any)
			if !ok {
				continue
			}
			rows, ok := toObjectRows(list)
			if !ok || len(rows) == 0 {
				continue
			}
			columns := collectColumns(rows)
			return rows, columns, true
		}
		return []map[string]any{typed}, collectColumns([]map[string]any{typed}), true
	default:
		return nil, nil, false
	}
}

func toObjectRows(list []any) ([]map[string]any, bool) {
	rows := make([]map[string]any, 0, len(list))
	for _, item := range list {
		obj, ok := item.(map[string]any)
		if !ok {
			return nil, false
		}
		rows = append(rows, obj)
	}
	return rows, true
}

func collectColumns(rows []map[string]any) []string {
	set := map[string]struct{}{}
	for _, row := range rows {
		for key := range row {
			set[key] = struct{}{}
		}
	}
	columns := make([]string, 0, len(set))
	for key := range set {
		columns = append(columns, key)
	}
	sort.Strings(columns)
	return columns
}

func stringify(value any) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case string:
		return typed
	case bool:
		if typed {
			return "true"
		}
		return "false"
	case float64:
		if typed == float64(int64(typed)) {
			return fmt.Sprintf("%.0f", typed)
		}
		return fmt.Sprintf("%v", typed)
	case []any, map[string]any:
		encoded, err := json.Marshal(typed)
		if err != nil {
			return fmt.Sprintf("%v", typed)
		}
		return string(encoded)
	default:
		return fmt.Sprintf("%v", typed)
	}
}
