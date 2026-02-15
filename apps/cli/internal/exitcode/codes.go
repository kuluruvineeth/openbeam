package exitcode

type Code int

const (
	Success      Code = 0
	Unknown      Code = 1
	Usage        Code = 2
	AuthRequired Code = 3
	Forbidden    Code = 4
	NotFound     Code = 5
	Conflict     Code = 6
	RateLimited  Code = 7
	Cancelled    Code = 8
	Timeout      Code = 9
	Network      Code = 10
	Server       Code = 11
)

func (c Code) Int() int {
	return int(c)
}
