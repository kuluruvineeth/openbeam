package plugin

import (
	"context"
	"errors"
	"io"
	"os"
	"os/exec"
)

type Streams struct {
	In  io.Reader
	Out io.Writer
	Err io.Writer
}

func Dispatch(ctx context.Context, path string, args []string, streams Streams) (int, error) {
	command := exec.CommandContext(ctx, path, args...)
	command.Stdin = readerOrDefault(streams.In, os.Stdin)
	command.Stdout = writerOrDefault(streams.Out, os.Stdout)
	command.Stderr = writerOrDefault(streams.Err, os.Stderr)
	err := command.Run()
	if err == nil {
		return 0, nil
	}
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		return exitErr.ExitCode(), nil
	}
	return 1, err
}

func readerOrDefault(value io.Reader, fallback *os.File) io.Reader {
	if value != nil {
		return value
	}
	return fallback
}

func writerOrDefault(value io.Writer, fallback *os.File) io.Writer {
	if value != nil {
		return value
	}
	return fallback
}
