package api

import (
	"encoding/json"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func marshalBody(body any) ([]byte, error) {
	encoded, err := json.Marshal(body)
	if err != nil {
		return nil, errs.New(errs.KindUsage, "invalid request payload", err)
	}
	return encoded, nil
}
