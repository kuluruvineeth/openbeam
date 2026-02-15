package exitcode

import "testing"

func TestCodeValues(t *testing.T) {
	tests := []struct {
		code Code
		want int
	}{
		{Success, 0},
		{Unknown, 1},
		{Usage, 2},
		{AuthRequired, 3},
		{Forbidden, 4},
		{NotFound, 5},
		{Conflict, 6},
		{RateLimited, 7},
		{Cancelled, 8},
		{Timeout, 9},
		{Network, 10},
		{Server, 11},
	}
	for _, tc := range tests {
		if got := tc.code.Int(); got != tc.want {
			t.Errorf("Code(%d).Int() = %d, want %d", tc.code, got, tc.want)
		}
	}
}

func TestCodeIntRoundTrip(t *testing.T) {
	for code := Success; code <= Server; code++ {
		if Code(code.Int()) != code {
			t.Errorf("round-trip failed for code %d", code)
		}
	}
}
