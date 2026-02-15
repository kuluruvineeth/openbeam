package main

import (
	"os"

	"github.com/openplane/openplane/apps/cli/internal/app"
)

func main() {
	os.Exit(app.Run(os.Args[1:]))
}
