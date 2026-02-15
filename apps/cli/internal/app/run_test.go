package app

import "testing"

func TestFindCommandIndex(t *testing.T) {
	tests := []struct {
		name string
		args []string
		want int
	}{
		{name: "simple", args: []string{"search", "query"}, want: 0},
		{name: "with global flag value", args: []string{"--profile", "dev", "search"}, want: 2},
		{name: "with equals flag", args: []string{"--host=http://localhost:3000", "search"}, want: 1},
		{name: "with bool flag", args: []string{"--debug", "search"}, want: 1},
		{name: "with short bool flag", args: []string{"-y", "search"}, want: 1},
		{name: "with separator", args: []string{"--profile", "dev", "--", "search"}, want: 3},
		{name: "none", args: []string{"--profile", "dev"}, want: -1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := findCommandIndex(tt.args)
			if got != tt.want {
				t.Fatalf("unexpected index: got %d want %d", got, tt.want)
			}
		})
	}
}
