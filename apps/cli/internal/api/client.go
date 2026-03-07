package api

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math"
	mrand "math/rand"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

const (
	defaultMaxRetries      = 3
	defaultInitialDelay    = 500 * time.Millisecond
	defaultMaxDelay        = 10 * time.Second
	maxResponseBodyBytes   = 128 << 20
)

type Metadata struct {
	RequestID  string `json:"request_id" yaml:"request_id"`
	DurationMS int64  `json:"duration_ms" yaml:"duration_ms"`
	Host       string `json:"host" yaml:"host"`
}

type retryConfig struct {
	maxRetries   int
	initialDelay time.Duration
	maxDelay     time.Duration
}

type Client struct {
	http        *http.Client
	baseURL     string
	token       string
	team        string
	userAgent   string
	trace       bool
	traceWriter io.Writer
	retry       retryConfig
}

var requestCounter atomic.Uint64

func NewClient(httpClient *http.Client, baseURL string, token string) *Client {
	return &Client{
		http:      httpClient,
		baseURL:   strings.TrimRight(baseURL, "/"),
		token:     token,
		userAgent: "openbeam-cli/0.1.0",
		trace:     false,
		retry: retryConfig{
			maxRetries:   defaultMaxRetries,
			initialDelay: defaultInitialDelay,
			maxDelay:     defaultMaxDelay,
		},
	}
}

func (c *Client) SetTeam(team string) {
	c.team = strings.TrimSpace(team)
}

func (c *Client) SetTrace(enabled bool, writer io.Writer) {
	c.trace = enabled
	c.traceWriter = writer
}

func (c *Client) GetJSON(ctx context.Context, path string, query url.Values) (any, Metadata, error) {
	return c.requestJSON(ctx, http.MethodGet, path, query, nil)
}

func (c *Client) PostJSON(ctx context.Context, path string, query url.Values, body any) (any, Metadata, error) {
	return c.requestJSON(ctx, http.MethodPost, path, query, body)
}

func (c *Client) PatchJSON(ctx context.Context, path string, query url.Values, body any) (any, Metadata, error) {
	return c.requestJSON(ctx, http.MethodPatch, path, query, body)
}

func (c *Client) DeleteJSON(ctx context.Context, path string, query url.Values) (any, Metadata, error) {
	return c.requestJSON(ctx, http.MethodDelete, path, query, nil)
}

func (c *Client) requestJSON(ctx context.Context, method string, path string, query url.Values, body any) (any, Metadata, error) {
	var payload []byte
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return nil, Metadata{}, errs.New(errs.KindUsage, "invalid request payload", err)
		}
		payload = encoded
	}
	requestURL, err := c.resolveURL(path, query)
	if err != nil {
		return nil, Metadata{}, errs.New(errs.KindUsage, "invalid request URL", err)
	}

	if err := c.enforceHTTPS(requestURL); err != nil {
		return nil, Metadata{}, err
	}

	requestID := nextRequestID()

	for attempt := range c.retry.maxRetries + 1 {
		req, err := http.NewRequestWithContext(ctx, method, requestURL, bytes.NewReader(payload))
		if err != nil {
			return nil, Metadata{}, errs.New(errs.KindUsage, "failed to create request", err)
		}
		req.Header.Set("Accept", "application/json")
		req.Header.Set("User-Agent", c.userAgent)
		if body != nil {
			req.Header.Set("Content-Type", "application/json")
		}
		if c.token != "" {
			req.Header.Set("Authorization", "Bearer "+c.token)
		}
		req.Header.Set("X-Request-ID", requestID)
		if c.team != "" {
			req.Header.Set("X-Openbeam-Team", c.team)
		}

		started := time.Now()
		c.tracef("-> %s %s request_id=%s attempt=%d", method, requestURL, requestID, attempt+1)
		resp, err := c.http.Do(req)
		if err != nil {
			elapsed := time.Since(started).Milliseconds()
			c.tracef("<- %s %s error=%v duration_ms=%d request_id=%s", method, requestURL, err, elapsed, requestID)
			transportErr := errs.FromTransport(err)
			if errs.IsKind(transportErr, errs.KindNetwork) && attempt < c.retry.maxRetries {
				delay := c.backoffDelay(attempt, nil)
				c.tracef("   retry attempt=%d delay=%s reason=network_error", attempt+1, delay)
				if err := sleepContext(ctx, delay); err != nil {
					return nil, Metadata{}, transportErr
				}
				continue
			}
			return nil, Metadata{}, transportErr
		}

		responsePayload, readErr := io.ReadAll(io.LimitReader(resp.Body, maxResponseBodyBytes))
		_ = resp.Body.Close()
		elapsed := time.Since(started).Milliseconds()

		if readErr != nil {
			return nil, Metadata{}, errs.New(errs.KindUnknown, "failed to read response", readErr)
		}

		if isRetryableStatus(resp.StatusCode) && attempt < c.retry.maxRetries {
			delay := c.backoffDelay(attempt, resp)
			c.tracef("   retry attempt=%d delay=%s reason=http_%d", attempt+1, delay, resp.StatusCode)
			if err := sleepContext(ctx, delay); err != nil {
				return nil, Metadata{}, errs.FromHTTP(resp.StatusCode, parseErrorBody(responsePayload))
			}
			continue
		}

		value := parseJSONOrText(responsePayload)
		if resp.StatusCode >= 400 {
			if object, ok := value.(map[string]any); ok {
				return nil, Metadata{}, errs.FromHTTP(resp.StatusCode, object)
			}
			return nil, Metadata{}, errs.FromHTTP(resp.StatusCode, map[string]any{"error": strings.TrimSpace(string(responsePayload))})
		}

		responseRequestID := resp.Header.Get("x-request-id")
		if responseRequestID == "" {
			responseRequestID = requestID
		}
		meta := Metadata{
			RequestID:  responseRequestID,
			DurationMS: elapsed,
			Host:       c.baseURL,
		}
		c.tracef("<- %s %s status=%d duration_ms=%d request_id=%s bytes=%d", method, requestURL, resp.StatusCode, elapsed, meta.RequestID, len(responsePayload))
		return value, meta, nil
	}

	return nil, Metadata{}, errs.New(errs.KindServer, "request failed after retries", nil)
}

func (c *Client) enforceHTTPS(requestURL string) error {
	parsed, err := url.Parse(requestURL)
	if err != nil {
		return nil
	}
	if parsed.Scheme == "http" && !isLocalhost(parsed.Host) {
		return errs.New(errs.KindUsage, "HTTPS required for non-localhost hosts (use --host with https://)", nil)
	}
	return nil
}

func isLocalhost(host string) bool {
	hostname := strings.Split(host, ":")[0]
	return hostname == "localhost" || hostname == "127.0.0.1" || hostname == "::1" || hostname == "[::1]"
}

func isRetryableStatus(status int) bool {
	return status == http.StatusTooManyRequests || status == http.StatusServiceUnavailable
}

func (c *Client) backoffDelay(attempt int, resp *http.Response) time.Duration {
	if resp != nil && resp.StatusCode == http.StatusTooManyRequests {
		if retryAfter := resp.Header.Get("Retry-After"); retryAfter != "" {
			if seconds, err := strconv.ParseInt(retryAfter, 10, 64); err == nil && seconds > 0 {
				return time.Duration(seconds) * time.Second
			}
		}
	}
	base := float64(c.retry.initialDelay) * math.Pow(2, float64(attempt))
	jitter := float64(c.retry.initialDelay) * mrand.Float64()
	delay := time.Duration(base + jitter)
	if delay > c.retry.maxDelay {
		delay = c.retry.maxDelay
	}
	return delay
}

func parseErrorBody(payload []byte) map[string]any {
	value := parseJSONOrText(payload)
	if object, ok := value.(map[string]any); ok {
		return object
	}
	return map[string]any{"error": strings.TrimSpace(string(payload))}
}

func sleepContext(ctx context.Context, d time.Duration) error {
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func (c *Client) resolveURL(path string, query url.Values) (string, error) {
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		parsed, err := url.Parse(path)
		if err != nil {
			return "", err
		}
		if len(query) > 0 {
			parsed.RawQuery = query.Encode()
		}
		return parsed.String(), nil
	}
	path = "/" + strings.TrimLeft(path, "/")
	resolved := c.baseURL + path
	parsed, err := url.Parse(resolved)
	if err != nil {
		return "", err
	}
	if len(query) > 0 {
		parsed.RawQuery = query.Encode()
	}
	return parsed.String(), nil
}

func parseJSONOrText(payload []byte) any {
	trimmed := strings.TrimSpace(string(payload))
	if trimmed == "" {
		return map[string]any{}
	}
	var value any
	if err := json.Unmarshal(payload, &value); err != nil {
		return trimmed
	}
	return value
}

func EncodeArgsJSON(raw string) (string, error) {
	if strings.TrimSpace(raw) == "" {
		return "{}", nil
	}
	var value any
	if err := json.Unmarshal([]byte(raw), &value); err != nil {
		return "", err
	}
	encoded, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	return string(encoded), nil
}

func MustObject(value any) (map[string]any, error) {
	object, ok := value.(map[string]any)
	if !ok {
		return nil, errs.New(errs.KindUsage, "expected object response", nil)
	}
	return object, nil
}

func (c *Client) tracef(format string, values ...any) {
	if !c.trace {
		return
	}
	writer := c.traceWriter
	if writer == nil {
		writer = io.Discard
	}
	_, _ = fmt.Fprintf(writer, format+"\n", values...)
}

func nextRequestID() string {
	sequence := requestCounter.Add(1)
	randomBytes := make([]byte, 8)
	if _, err := rand.Read(randomBytes); err == nil {
		return "opcli-" + hex.EncodeToString(randomBytes) + fmt.Sprintf("-%d", sequence)
	}
	return fmt.Sprintf("opcli-%d-%d", time.Now().UnixNano(), sequence)
}
