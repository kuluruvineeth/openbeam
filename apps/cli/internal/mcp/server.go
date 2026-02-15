package mcp

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"strings"
)

type Request struct {
	JSONRPC string         `json:"jsonrpc"`
	ID      any            `json:"id,omitempty"`
	Method  string         `json:"method"`
	Params  map[string]any `json:"params,omitempty"`
}

type Response struct {
	JSONRPC string    `json:"jsonrpc"`
	ID      any       `json:"id,omitempty"`
	Result  any       `json:"result,omitempty"`
	Error   *RPCError `json:"error,omitempty"`
}

type RPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type Handler interface {
	Handle(context.Context, Request) Response
}

type Server struct {
	In      io.Reader
	Out     io.Writer
	Handler Handler
}

func (s *Server) Serve(ctx context.Context) error {
	scanner := bufio.NewScanner(s.In)
	scanner.Buffer(make([]byte, 0, 4096), 4*1024*1024)
	encoder := json.NewEncoder(s.Out)
	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var request Request
		if err := json.Unmarshal([]byte(line), &request); err != nil {
			if err := encoder.Encode(Response{JSONRPC: "2.0", Error: &RPCError{Code: -32700, Message: "parse error"}}); err != nil {
				return err
			}
			continue
		}
		response := s.Handler.Handle(ctx, request)
		if response.JSONRPC == "" {
			response.JSONRPC = "2.0"
		}
		if response.ID == nil {
			response.ID = request.ID
		}
		if err := encoder.Encode(response); err != nil {
			return err
		}
	}
	return scanner.Err()
}
