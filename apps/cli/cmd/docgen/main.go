package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/spf13/cobra/doc"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/boot"
)

const generationDate = "2026-04-19"

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	if len(os.Args) < 2 {
		return fmt.Errorf("usage: docgen <output-dir>")
	}
	outDir := os.Args[1]
	manDir := filepath.Join(outDir, "manpages")
	completionDir := filepath.Join(outDir, "completions")

	for _, dir := range []string{manDir, completionDir} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}

	root, err := boot.NewRootCommand(context.Background(), os.Stdin, io.Discard, io.Discard)
	if err != nil {
		return err
	}
	root.DisableAutoGenTag = true

	header := &doc.GenManHeader{
		Title:   "OPENBEAM",
		Section: "1",
		Source:  "OpenBeam CLI",
		Manual:  "OpenBeam Manual",
		Date:    mustDate(generationDate),
	}
	if err := doc.GenManTree(root, header, manDir); err != nil {
		return err
	}

	shells := []struct {
		name string
		gen  func(io.Writer) error
	}{
		{"openbeam.bash", func(w io.Writer) error { return root.GenBashCompletionV2(w, true) }},
		{"openbeam.zsh", func(w io.Writer) error { return root.GenZshCompletion(w) }},
		{"openbeam.fish", func(w io.Writer) error { return root.GenFishCompletion(w, true) }},
		{"openbeam.ps1", func(w io.Writer) error { return root.GenPowerShellCompletionWithDesc(w) }},
	}
	for _, shell := range shells {
		f, err := os.Create(filepath.Join(completionDir, shell.name))
		if err != nil {
			return err
		}
		if err := shell.gen(f); err != nil {
			f.Close()
			return err
		}
		if err := f.Close(); err != nil {
			return err
		}
	}
	return nil
}

func mustDate(s string) *time.Time {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		panic(err)
	}
	return &t
}
