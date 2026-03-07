package api

import (
	"bufio"
	"bytes"
	"context"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

type SSEEvent struct {
	Event string
	Data  string
}

func (c *Client) StreamSSE(ctx context.Context, path string, query url.Values, body any, handler func(SSEEvent) error) error {
	requestURL, err := c.resolveURL(path, query)
	if err != nil {
		return errs.New(errs.KindUsage, "invalid request URL", err)
	}
	payload := []byte(nil)
	if body != nil {
		encoded, err := marshalBody(body)
		if err != nil {
			return err
		}
		payload = encoded
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, requestURL, bytes.NewReader(payload))
	if err != nil {
		return errs.New(errs.KindUsage, "failed to create request", err)
	}
	req.Header.Set("Accept", "text/event-stream")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("User-Agent", c.userAgent)
	req.Header.Set("Content-Type", "application/json")
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	requestID := nextRequestID()
	req.Header.Set("X-Request-ID", requestID)
	if c.team != "" {
		req.Header.Set("X-Openbeam-Team", c.team)
	}
	started := time.Now()
	c.tracef("-> %s %s request_id=%s", http.MethodPost, requestURL, requestID)
	resp, err := c.http.Do(req)
	if err != nil {
		c.tracef("<- %s %s error=%v duration_ms=%d request_id=%s", http.MethodPost, requestURL, err, time.Since(started).Milliseconds(), requestID)
		return errs.FromTransport(err)
	}
	defer func() { _ = resp.Body.Close() }()
	c.tracef("<- %s %s status=%d duration_ms=%d request_id=%s", http.MethodPost, requestURL, resp.StatusCode, time.Since(started).Milliseconds(), requestID)
	if resp.StatusCode >= 400 {
		raw, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			return errs.New(errs.KindUnknown, "failed to read response", readErr)
		}
		value := parseJSONOrText(raw)
		if object, ok := value.(map[string]any); ok {
			return errs.FromHTTP(resp.StatusCode, object)
		}
		if len(raw) > 0 {
			return errs.FromHTTP(resp.StatusCode, map[string]any{"error": strings.TrimSpace(string(raw))})
		}
		return errs.FromHTTP(resp.StatusCode, map[string]any{"error": "request failed"})
	}

	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 4096), 4*1024*1024)
	event := SSEEvent{}
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			if strings.TrimSpace(event.Data) != "" {
				if err := handler(event); err != nil {
					return err
				}
			}
			event = SSEEvent{}
			continue
		}
		if strings.HasPrefix(line, "event:") {
			event.Event = strings.TrimSpace(strings.TrimPrefix(line, "event:"))
			continue
		}
		if strings.HasPrefix(line, "data:") {
			fragment := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
			if event.Data == "" {
				event.Data = fragment
			} else {
				event.Data += "\n" + fragment
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return errs.New(errs.KindUnknown, "stream interrupted", err)
	}
	if strings.TrimSpace(event.Data) != "" {
		if err := handler(event); err != nil {
			return err
		}
	}
	return nil
}
