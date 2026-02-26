package daemon

import (
	"fmt"
	"strings"
)

func FormatTimelineItem(item TimelineItem) string {
	switch item.Type {
	case "assistant_message":
		return item.Text
	case "reasoning":
		return fmt.Sprintf("\n[Reasoning] %s", item.Text)
	case "tool_call":
		status := item.Status
		if status == "" {
			status = "started"
		}
		return fmt.Sprintf("\n[Tool: %s] %s", item.Name, status)
	case "error":
		return fmt.Sprintf("\n[Error] %s", item.Message)
	case "user_message":
		return fmt.Sprintf("\n[User] %s", item.Text)
	default:
		return ""
	}
}

func FormatTimeline(items []TimelineItem, maxItems int) string {
	if len(items) == 0 {
		return "No activity to display."
	}

	display := items
	if maxItems > 0 && len(items) > maxItems {
		display = items[len(items)-maxItems:]
	}

	var b strings.Builder
	for _, item := range display {
		line := FormatTimelineItem(item)
		if line != "" {
			b.WriteString(line)
			b.WriteString("\n")
		}
	}

	result := b.String()
	if strings.TrimSpace(result) == "" {
		return "No activity to display."
	}
	return result
}

func MatchesFilter(item TimelineItem, filter string) bool {
	if filter == "" {
		return true
	}

	lower := strings.ToLower(filter)
	itemType := strings.ToLower(item.Type)

	switch lower {
	case "tools":
		return itemType == "tool_call"
	case "text":
		return itemType == "user_message" || itemType == "assistant_message" || itemType == "reasoning"
	case "errors":
		return itemType == "error"
	case "permissions":
		return strings.Contains(itemType, "permission")
	default:
		return strings.Contains(itemType, lower)
	}
}
