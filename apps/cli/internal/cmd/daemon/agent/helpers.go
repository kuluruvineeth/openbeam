package agent

import (
	"encoding/json"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

func parseJSON(raw json.RawMessage, target any) error {
	if err := json.Unmarshal(raw, target); err != nil {
		return errs.New(errs.KindUnknown, "failed to parse daemon response", err)
	}
	return nil
}
