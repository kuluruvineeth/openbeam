package daemon

import "strings"

func ResolveAgentID(agents []AgentSnapshot, idOrPrefix string) (*AgentSnapshot, error) {
	trimmed := strings.TrimSpace(idOrPrefix)
	if trimmed == "" {
		return nil, &AgentNotFoundError{ID: idOrPrefix}
	}

	for i := range agents {
		if agents[i].ID == trimmed {
			return &agents[i], nil
		}
	}

	var matches []*AgentSnapshot
	for i := range agents {
		if strings.HasPrefix(agents[i].ID, trimmed) {
			matches = append(matches, &agents[i])
		}
	}

	if len(matches) == 1 {
		return matches[0], nil
	}

	if len(matches) > 1 {
		return nil, &AgentNotFoundError{ID: trimmed + " (ambiguous, matches " + strings.Join(matchIDs(matches), ", ") + ")"}
	}

	return nil, &AgentNotFoundError{ID: idOrPrefix}
}

func matchIDs(agents []*AgentSnapshot) []string {
	ids := make([]string, len(agents))
	for i, a := range agents {
		ids[i] = a.ID[:min(7, len(a.ID))]
	}
	return ids
}
