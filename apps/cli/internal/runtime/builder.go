package runtime

import (
	"net/http"
	"os"
	"strings"
	"time"

	"golang.org/x/term"

	"github.com/openplane/openplane/apps/cli/internal/api"
	"github.com/openplane/openplane/apps/cli/internal/auth"
	"github.com/openplane/openplane/apps/cli/internal/config"
	"github.com/openplane/openplane/apps/cli/internal/errs"
	"github.com/openplane/openplane/apps/cli/internal/output"
)

type Builder struct {
	Streams    Streams
	HTTPClient *http.Client
}

func (b *Builder) Build(options GlobalOptions) (*Runtime, error) {
	store, err := config.NewStore("")
	if err != nil {
		return nil, err
	}
	cfg, profile, profileName, err := store.Resolve(options.Profile)
	if err != nil {
		return nil, errs.New(errs.KindUsage, "invalid profile", err)
	}

	if options.Host != "" {
		profile.Host = options.Host
	} else if host := strings.TrimSpace(os.Getenv("OPENPLANE_HOST")); host != "" {
		profile.Host = host
	}
	if options.Team != "" {
		profile.Team = options.Team
	} else if team := strings.TrimSpace(os.Getenv("OPENPLANE_TEAM")); team != "" {
		profile.Team = team
	}
	profile.Color = resolveColor(options.Color, profile.Color, options.NoColor)
	if profile.Color == "" {
		return nil, errs.New(errs.KindUsage, "invalid --color value", nil)
	}
	if profile.Host == "" {
		return nil, errs.New(errs.KindUsage, "profile host is required", nil)
	}
	timeout, err := resolveTimeout(options.Timeout, profile.Timeout)
	if err != nil {
		return nil, err
	}
	profile.Timeout = timeout

	secretStore, err := auth.NewDefaultStore()
	if err != nil {
		return nil, err
	}
	apiKey, err := resolveAPIKey(secretStore, profile)
	if err != nil {
		return nil, err
	}

	httpClient := b.HTTPClient
	if httpClient != nil {
		copyClient := *httpClient
		if timeout > 0 {
			copyClient.Timeout = timeout
		}
		httpClient = &copyClient
	} else {
		httpClient = &http.Client{Timeout: timeout}
	}

	format := resolveFormat(options.Output, profile.Output, b.Streams.OutFD)
	if !format.IsValid() {
		return nil, errs.New(errs.KindUsage, "invalid --output value", nil)
	}
	if options.Raw && (options.JQ != "" || options.Template != "") {
		return nil, errs.New(errs.KindUsage, "--raw cannot be used with --jq or --template", nil)
	}
	if (options.JQ != "" || options.Template != "") && !format.SupportsTransform() {
		return nil, errs.New(errs.KindUsage, "--jq and --template require --output json|yaml|ndjson", nil)
	}
	out := output.Options{
		Format:   format,
		JQ:       options.JQ,
		Template: options.Template,
		Raw:      options.Raw,
	}
	options.Output = string(format)
	options.Color = profile.Color
	options.Timeout = timeout.String()

	client := api.NewClient(httpClient, profile.Host, apiKey)
	client.SetTeam(profile.Team)
	client.SetTrace(options.Trace || options.Debug, b.Streams.Err)

	rt := &Runtime{
		Streams:     b.Streams,
		Options:     options,
		ConfigStore: store,
		ConfigFile:  cfg,
		ProfileName: profileName,
		Profile:     profile,
		SecretStore: secretStore,
		APIClient:   client,
		APIKey:      apiKey,
		Output:      out,
	}
	return rt, nil
}

func resolveAPIKey(store auth.Store, profile config.Profile) (string, error) {
	if fromEnv := os.Getenv("OPENPLANE_API_KEY"); fromEnv != "" {
		return fromEnv, nil
	}
	if profile.APIKeyRef == "" {
		return "", nil
	}
	value, err := store.Get(profile.APIKeyRef)
	if err == nil {
		return value, nil
	}
	if err == auth.ErrSecretNotFound {
		return "", nil
	}
	return "", err
}

func resolveFormat(flag string, profile string, fd uintptr) output.Format {
	if strings.TrimSpace(flag) != "" {
		return output.Format(strings.ToLower(strings.TrimSpace(flag)))
	}
	if strings.TrimSpace(profile) != "" {
		return output.Format(strings.ToLower(strings.TrimSpace(profile)))
	}
	if fd != InvalidFD && term.IsTerminal(int(fd)) {
		return output.FormatTable
	}
	return output.FormatJSON
}

func resolveColor(flag string, profile string, noColor bool) string {
	if noColor || isNoColorEnvEnabled() {
		return "never"
	}
	value := strings.ToLower(strings.TrimSpace(flag))
	if value == "" {
		value = strings.ToLower(strings.TrimSpace(profile))
	}
	if value == "" {
		value = "auto"
	}
	switch value {
	case "auto", "always", "never":
		return value
	default:
		return ""
	}
}

func isNoColorEnvEnabled() bool {
	_, ok := os.LookupEnv("NO_COLOR")
	return ok
}

func resolveTimeout(flag string, profile time.Duration) (time.Duration, error) {
	timeout := profile
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	if strings.TrimSpace(flag) == "" {
		return timeout, nil
	}
	parsed, err := time.ParseDuration(strings.TrimSpace(flag))
	if err != nil {
		return 0, errs.New(errs.KindUsage, "invalid --timeout value", err)
	}
	if parsed <= 0 {
		return 0, errs.New(errs.KindUsage, "--timeout must be greater than zero", nil)
	}
	return parsed, nil
}
