package daemon

type AgentSnapshot struct {
	ID                 string            `json:"id"`
	Title              string            `json:"title"`
	Provider           string            `json:"provider"`
	Model              string            `json:"model"`
	Status             string            `json:"status"`
	CurrentModeID      string            `json:"currentModeId"`
	Cwd                string            `json:"cwd"`
	CreatedAt          string            `json:"createdAt"`
	UpdatedAt          string            `json:"updatedAt"`
	ArchivedAt         string            `json:"archivedAt,omitempty"`
	Labels             map[string]string `json:"labels,omitempty"`
	LastUsage          *AgentUsage       `json:"lastUsage,omitempty"`
	Capabilities       *AgentCaps        `json:"capabilities,omitempty"`
	AvailableModes     []AgentMode       `json:"availableModes,omitempty"`
	PendingPermissions []PermissionReq   `json:"pendingPermissions,omitempty"`
}

type AgentUsage struct {
	InputTokens       int     `json:"inputTokens"`
	OutputTokens      int     `json:"outputTokens"`
	CachedInputTokens int     `json:"cachedInputTokens"`
	TotalCostUSD      float64 `json:"totalCostUsd"`
}

type AgentCaps struct {
	SupportsStreaming          bool `json:"supportsStreaming"`
	SupportsSessionPersistence bool `json:"supportsSessionPersistence"`
	SupportsDynamicModes       bool `json:"supportsDynamicModes"`
	SupportsMcpServers         bool `json:"supportsMcpServers"`
}

type AgentMode struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description,omitempty"`
}

type PermissionReq struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Kind        string `json:"kind,omitempty"`
	Description string `json:"description,omitempty"`
}

type AgentListEntry struct {
	Agent AgentSnapshot `json:"agent"`
}

type AgentListResponse struct {
	Entries []AgentListEntry `json:"entries"`
}

type AgentCreateRequest struct {
	Provider      string            `json:"provider"`
	Cwd           string            `json:"cwd"`
	Title         string            `json:"title,omitempty"`
	ModeID        string            `json:"modeId,omitempty"`
	Model         string            `json:"model,omitempty"`
	InitialPrompt string            `json:"initialPrompt"`
	Labels        map[string]string `json:"labels,omitempty"`
}

type AgentSendRequest struct {
	Prompt string `json:"prompt"`
}

type PermissionResponse struct {
	Behavior     string         `json:"behavior"`
	Message      string         `json:"message,omitempty"`
	Interrupt    bool           `json:"interrupt,omitempty"`
	UpdatedInput map[string]any `json:"updatedInput,omitempty"`
}

type WaitFinishState struct {
	Status      string         `json:"status"`
	Error       string         `json:"error,omitempty"`
	LastMessage string         `json:"lastMessage,omitempty"`
	Final       *AgentSnapshot `json:"final,omitempty"`
}

type TimelineEntry struct {
	Item TimelineItem `json:"item"`
}

type TimelineItem struct {
	Type    string `json:"type"`
	Text    string `json:"text,omitempty"`
	Name    string `json:"name,omitempty"`
	Status  string `json:"status,omitempty"`
	Message string `json:"message,omitempty"`
}

type TimelineResponse struct {
	Entries []TimelineEntry `json:"entries"`
}

type ProviderModelInfo struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description,omitempty"`
}

type ProviderModelsResponse struct {
	Models []ProviderModelInfo `json:"models"`
	Error  string              `json:"error,omitempty"`
}

type SpeechModelInfo struct {
	ID           string   `json:"id"`
	Kind         string   `json:"kind"`
	IsDownloaded bool     `json:"isDownloaded"`
	ModelDir     string   `json:"modelDir"`
	MissingFiles []string `json:"missingFiles,omitempty"`
}

type SpeechModelsResponse struct {
	Models []SpeechModelInfo `json:"models"`
}

type SpeechDownloadRequest struct {
	ModelIDs []string `json:"modelIds,omitempty"`
}

type SpeechDownloadResponse struct {
	DownloadedModelIDs []string `json:"downloadedModelIds"`
	Error              string   `json:"error,omitempty"`
}

type WorktreeInfo struct {
	WorktreePath string `json:"worktreePath"`
	BranchName   string `json:"branchName,omitempty"`
}

type WorktreeListResponse struct {
	Worktrees []WorktreeInfo     `json:"worktrees"`
	Error     *WorktreeListError `json:"error,omitempty"`
}

type WorktreeListError struct {
	Message string `json:"message"`
}

type WorktreeArchiveRequest struct {
	WorktreePath string `json:"worktreePath"`
}

type WorktreeArchiveResponse struct {
	RemovedAgents []string           `json:"removedAgents,omitempty"`
	Error         *WorktreeListError `json:"error,omitempty"`
}

type PairingOffer struct {
	URL           string `json:"url,omitempty"`
	QR            string `json:"qr,omitempty"`
	RelayEnabled  bool   `json:"relayEnabled"`
}
