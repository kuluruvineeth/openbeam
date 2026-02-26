package daemon

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

const ClientTimeout = 30 * time.Second

type Client struct {
	baseURL    string
	httpClient *http.Client
	sessionKey string
}

func NewClient(listen string, sessionKey string) *Client {
	return &Client{
		baseURL:    fmt.Sprintf("http://%s", listen),
		httpClient: &http.Client{Timeout: ClientTimeout},
		sessionKey: sessionKey,
	}
}

func NewClientFromState(ctx context.Context, daemonHome string) (*Client, error) {
	state, err := GetState(ctx, daemonHome)
	if err != nil {
		return nil, &DaemonNotRunningError{Listen: "", Cause: err}
	}

	if !state.Running || !state.Healthy {
		listen := ""
		if state.PidInfo != nil {
			listen = state.PidInfo.SockPath
		}
		return nil, &DaemonNotRunningError{Listen: listen}
	}

	sessionKey, err := LoadOrCreateSessionKey(daemonHome)
	if err != nil {
		return nil, fmt.Errorf("load session key: %w", err)
	}

	return NewClient(state.Listen, sessionKey), nil
}

func (c *Client) Get(ctx context.Context, path string, query url.Values) (json.RawMessage, error) {
	reqURL := c.baseURL + path
	if len(query) > 0 {
		reqURL += "?" + query.Encode()
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, err
	}
	c.setHeaders(req)

	return c.doRequest(req)
}

func (c *Client) Post(ctx context.Context, path string, body any) (json.RawMessage, error) {
	return c.doJSON(ctx, http.MethodPost, path, body)
}

func (c *Client) Patch(ctx context.Context, path string, body any) (json.RawMessage, error) {
	return c.doJSON(ctx, http.MethodPatch, path, body)
}

func (c *Client) Delete(ctx context.Context, path string) (json.RawMessage, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, c.baseURL+path, nil)
	if err != nil {
		return nil, err
	}
	c.setHeaders(req)

	return c.doRequest(req)
}

func (c *Client) doJSON(ctx context.Context, method string, path string, body any) (json.RawMessage, error) {
	var bodyReader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal body: %w", err)
		}
		bodyReader = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bodyReader)
	if err != nil {
		return nil, err
	}
	c.setHeaders(req)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	return c.doRequest(req)
}

func (c *Client) doRequest(req *http.Request) (json.RawMessage, error) {
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, &DaemonNotRunningError{Listen: c.baseURL, Cause: err}
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("daemon returned %d: %s", resp.StatusCode, string(data))
	}

	return json.RawMessage(data), nil
}

func (c *Client) setHeaders(req *http.Request) {
	req.Header.Set("Accept", "application/json")
	if c.sessionKey != "" {
		req.Header.Set("X-Session-Key", c.sessionKey)
	}
}
