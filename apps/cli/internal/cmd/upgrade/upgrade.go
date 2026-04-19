package upgrade

import (
	"archive/tar"
	"archive/zip"
	"bufio"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/kuluruvineeth/openbeam/apps/cli/internal/cmd/version"
	"github.com/kuluruvineeth/openbeam/apps/cli/internal/errs"
)

const (
	repoSlug             = "kuluruvineeth/openplane"
	releasesAPI          = "https://api.github.com/repos/" + repoSlug + "/releases"
	releaseDownloadBase  = "https://github.com/" + repoSlug + "/releases/download"
	tagPrefix            = "cli-v"
	binaryName           = "openbeam"
	githubAPITimeout     = 15 * time.Second
	downloadTimeout      = 5 * time.Minute
	userAgent            = "openbeam-cli-upgrade"
	maxReleasesScanned   = 30
	archiveInspectLimit  = 100 * 1024 * 1024
	checksumLineMinParts = 2
)

type githubRelease struct {
	TagName    string `json:"tag_name"`
	Prerelease bool   `json:"prerelease"`
	Draft      bool   `json:"draft"`
	HTMLURL    string `json:"html_url"`
}

type target struct {
	version   string
	archive   string
	checksums string
	binary    string
}

func NewCommand() *cobra.Command {
	var (
		pinned     string
		dryRun     bool
		skipConfirm bool
		includePre  bool
	)
	cmd := &cobra.Command{
		Use:   "upgrade",
		Short: "Upgrade the CLI to the latest release",
		Long:  "Downloads the latest openbeam CLI release from GitHub, verifies its checksum, and replaces the running binary in place.",
		RunE: func(cmd *cobra.Command, args []string) error {
			return run(cmd, pinned, dryRun, skipConfirm, includePre)
		},
	}
	cmd.Flags().StringVar(&pinned, "version", "", "install a specific version (e.g. cli-v0.2.0 or 0.2.0)")
	cmd.Flags().BoolVar(&dryRun, "dry-run", false, "report what would happen without making changes")
	cmd.Flags().BoolVar(&includePre, "prerelease", false, "include pre-releases when resolving latest")
	cmd.Flags().BoolVarP(&skipConfirm, "yes", "y", false, "skip confirmation prompt")
	return cmd
}

func run(cmd *cobra.Command, pinned string, dryRun, skipConfirm, includePrerelease bool) error {
	out := cmd.OutOrStdout()
	ctx := cmd.Context()

	current := normalizeVersion(version.Version)
	desired, err := resolveDesiredVersion(ctx, pinned, includePrerelease)
	if err != nil {
		return err
	}
	if current == desired {
		fmt.Fprintf(out, "openbeam is already %s (latest%s).\n", current, pinnedQualifier(pinned))
		return nil
	}

	self, err := resolveSelfPath()
	if err != nil {
		return err
	}

	if manager := detectPackageManager(self); manager != "" {
		return packageManagerGuidance(manager, desired, self)
	}

	if err := ensureWritable(self); err != nil {
		return err
	}

	t, err := resolveTarget(desired)
	if err != nil {
		return err
	}

	fmt.Fprintf(out, "Current: %s\nTarget:  %s\nBinary:  %s\n\n", current, desired, self)

	if dryRun {
		fmt.Fprintf(out, "Would download %s and install %s.\n", t.archive, t.binary)
		return nil
	}

	if !skipConfirm && !confirm(cmd, fmt.Sprintf("Replace %s with openbeam %s?", self, desired)) {
		fmt.Fprintln(out, "Cancelled.")
		return nil
	}

	return install(ctx, t, self, out)
}

func resolveDesiredVersion(ctx context.Context, pinned string, includePrerelease bool) (string, error) {
	if pinned != "" {
		version := normalizeVersion(pinned)
		if !isValidSemver(version) {
			return "", errs.New(errs.KindUsage, fmt.Sprintf("invalid version: %q (expected cli-vX.Y.Z or X.Y.Z)", pinned), nil)
		}
		return version, nil
	}
	return fetchLatestVersion(ctx, includePrerelease)
}

func fetchLatestVersion(ctx context.Context, includePrerelease bool) (string, error) {
	url := releasesAPI + "?per_page=" + fmt.Sprint(maxReleasesScanned)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", errs.New(errs.KindUnknown, "building request", err)
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", userAgent)

	client := &http.Client{Timeout: githubAPITimeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", errs.FromTransport(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusTooManyRequests {
		return "", errs.New(errs.KindRateLimited, "GitHub API rate limit exceeded; retry later or set --version explicitly", nil)
	}
	if resp.StatusCode != http.StatusOK {
		return "", errs.FromHTTP(resp.StatusCode, nil)
	}

	var releases []githubRelease
	if err := json.NewDecoder(resp.Body).Decode(&releases); err != nil {
		return "", errs.New(errs.KindServer, "decoding GitHub response", err)
	}

	for _, r := range releases {
		if r.Draft {
			continue
		}
		if r.Prerelease && !includePrerelease {
			continue
		}
		if !strings.HasPrefix(r.TagName, tagPrefix) {
			continue
		}
		return strings.TrimPrefix(r.TagName, tagPrefix), nil
	}
	return "", errs.New(errs.KindNotFound, "no CLI releases found on GitHub", nil)
}

func resolveTarget(version string) (target, error) {
	goos := runtime.GOOS
	arch := archFor(runtime.GOARCH)
	if goos == "" || arch == "" {
		return target{}, errs.New(errs.KindUnknown, fmt.Sprintf("unsupported platform %s/%s", runtime.GOOS, runtime.GOARCH), nil)
	}

	ext := "tar.gz"
	binary := binaryName
	if goos == "windows" {
		ext = "zip"
		binary = binaryName + ".exe"
	}

	archive := fmt.Sprintf("%s_%s_%s_%s.%s", binaryName, version, goos, arch, ext)
	return target{
		version:   version,
		archive:   archive,
		checksums: "checksums.txt",
		binary:    binary,
	}, nil
}

func archFor(goarch string) string {
	switch goarch {
	case "amd64":
		return "x86_64"
	case "arm64":
		return "arm64"
	default:
		return ""
	}
}

func resolveSelfPath() (string, error) {
	self, err := os.Executable()
	if err != nil {
		return "", errs.New(errs.KindUnknown, "locating current binary", err)
	}
	resolved, err := filepath.EvalSymlinks(self)
	if err != nil {
		return "", errs.New(errs.KindUnknown, "resolving binary symlinks", err)
	}
	return resolved, nil
}

func detectPackageManager(self string) string {
	if strings.Contains(self, string(filepath.Separator)+"Cellar"+string(filepath.Separator)) ||
		strings.Contains(self, string(filepath.Separator)+".linuxbrew"+string(filepath.Separator)) ||
		strings.Contains(self, string(filepath.Separator)+"homebrew"+string(filepath.Separator)) {
		return "homebrew"
	}
	if strings.Contains(strings.ToLower(self), string(filepath.Separator)+"scoop"+string(filepath.Separator)) {
		return "scoop"
	}
	if runtime.GOOS == "linux" {
		if owner, ok := dpkgOwner(self); ok {
			return "apt:" + owner
		}
		if owner, ok := rpmOwner(self); ok {
			return "rpm:" + owner
		}
		if owner, ok := pacmanOwner(self); ok {
			return "pacman:" + owner
		}
		if owner, ok := apkOwner(self); ok {
			return "apk:" + owner
		}
	}
	return ""
}

func dpkgOwner(path string) (string, bool) {
	return packageOwner("dpkg", []string{"-S", path}, ":")
}

func rpmOwner(path string) (string, bool) {
	return packageOwner("rpm", []string{"-qf", path}, "")
}

func pacmanOwner(path string) (string, bool) {
	out, _, ok := execQuery("pacman", []string{"-Qo", path})
	if !ok {
		return "", false
	}
	if strings.Contains(out, "No package owns") {
		return "", false
	}
	return strings.TrimSpace(out), true
}

func apkOwner(path string) (string, bool) {
	out, _, ok := execQuery("apk", []string{"info", "--who-owns", path})
	if !ok {
		return "", false
	}
	return strings.TrimSpace(out), true
}

func packageOwner(tool string, args []string, sep string) (string, bool) {
	out, _, ok := execQuery(tool, args)
	if !ok {
		return "", false
	}
	out = strings.TrimSpace(out)
	if out == "" {
		return "", false
	}
	if sep != "" {
		if idx := strings.Index(out, sep); idx > 0 {
			return out[:idx], true
		}
	}
	return out, true
}

func execQuery(tool string, args []string) (string, string, bool) {
	path, err := exec.LookPath(tool)
	if err != nil {
		return "", "", false
	}
	var stdout, stderr bytes.Buffer
	cmd := exec.Command(path, args...)
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return stdout.String(), stderr.String(), false
	}
	return stdout.String(), stderr.String(), true
}

func packageManagerGuidance(manager, version, self string) error {
	var hint string
	switch {
	case manager == "homebrew":
		hint = "brew upgrade openbeam"
	case manager == "scoop":
		hint = "scoop update openbeam"
	case strings.HasPrefix(manager, "apt:"):
		hint = "sudo apt-get update && sudo apt-get install --only-upgrade openbeam"
	case strings.HasPrefix(manager, "rpm:"):
		hint = "sudo dnf upgrade openbeam"
	case strings.HasPrefix(manager, "pacman:"):
		hint = "sudo pacman -Syu openbeam"
	case strings.HasPrefix(manager, "apk:"):
		hint = "sudo apk upgrade openbeam"
	default:
		hint = "your system package manager"
	}
	return errs.New(
		errs.KindForbidden,
		fmt.Sprintf("openbeam at %s is managed by %s — upgrade with:\n  %s\n(target version: %s)", self, manager, hint, version),
		nil,
	)
}

func ensureWritable(self string) error {
	dir := filepath.Dir(self)
	probe, err := os.CreateTemp(dir, ".openbeam-upgrade-probe-*")
	if err != nil {
		return errs.New(errs.KindForbidden, fmt.Sprintf("no write permission on %s — rerun with sudo or reinstall", dir), err)
	}
	probeName := probe.Name()
	probe.Close()
	_ = os.Remove(probeName)
	return nil
}

func install(ctx context.Context, t target, self string, out io.Writer) error {
	tmp, err := os.MkdirTemp("", "openbeam-upgrade-")
	if err != nil {
		return errs.New(errs.KindUnknown, "creating temp dir", err)
	}
	defer os.RemoveAll(tmp)

	base := releaseDownloadBase + "/" + tagPrefix + t.version
	archivePath := filepath.Join(tmp, t.archive)
	checksumsPath := filepath.Join(tmp, t.checksums)

	fmt.Fprintf(out, "Downloading %s...\n", t.archive)
	if err := download(ctx, base+"/"+t.archive, archivePath); err != nil {
		return err
	}
	if err := download(ctx, base+"/"+t.checksums, checksumsPath); err != nil {
		return err
	}

	fmt.Fprintln(out, "Verifying checksum...")
	if err := verifyChecksum(archivePath, checksumsPath, t.archive); err != nil {
		return err
	}

	fmt.Fprintln(out, "Extracting binary...")
	extractedBinary, err := extractBinary(archivePath, t.binary, tmp)
	if err != nil {
		return err
	}

	fmt.Fprintln(out, "Installing...")
	if err := swapBinary(extractedBinary, self); err != nil {
		return err
	}

	fmt.Fprintf(out, "\nopenbeam upgraded to %s.\n", t.version)
	return nil
}

func download(ctx context.Context, url, dest string) error {
	ctx, cancel := context.WithTimeout(ctx, downloadTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return errs.New(errs.KindUnknown, "building download request", err)
	}
	req.Header.Set("User-Agent", userAgent)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return errs.FromTransport(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return errs.FromHTTP(resp.StatusCode, map[string]any{"url": url})
	}

	f, err := os.Create(dest)
	if err != nil {
		return errs.New(errs.KindUnknown, "creating download file", err)
	}
	defer f.Close()

	if _, err := io.Copy(f, resp.Body); err != nil {
		return errs.New(errs.KindNetwork, "downloading "+url, err)
	}
	return nil
}

func verifyChecksum(archivePath, checksumsPath, archiveName string) error {
	expected, err := readExpectedChecksum(checksumsPath, archiveName)
	if err != nil {
		return err
	}

	f, err := os.Open(archivePath)
	if err != nil {
		return errs.New(errs.KindUnknown, "opening archive", err)
	}
	defer f.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, f); err != nil {
		return errs.New(errs.KindUnknown, "hashing archive", err)
	}
	actual := hex.EncodeToString(hasher.Sum(nil))

	if actual != expected {
		return errs.New(
			errs.KindServer,
			fmt.Sprintf("checksum mismatch for %s: expected %s, got %s", archiveName, expected, actual),
			nil,
		)
	}
	return nil
}

func readExpectedChecksum(checksumsPath, archiveName string) (string, error) {
	f, err := os.Open(checksumsPath)
	if err != nil {
		return "", errs.New(errs.KindUnknown, "opening checksums", err)
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) < checksumLineMinParts {
			continue
		}
		if fields[1] == archiveName {
			return fields[0], nil
		}
	}
	if err := scanner.Err(); err != nil {
		return "", errs.New(errs.KindUnknown, "reading checksums", err)
	}
	return "", errs.New(errs.KindNotFound, fmt.Sprintf("checksum for %s not found in checksums.txt", archiveName), nil)
}

func extractBinary(archivePath, binaryName, dest string) (string, error) {
	if strings.HasSuffix(archivePath, ".zip") {
		return extractZipBinary(archivePath, binaryName, dest)
	}
	return extractTarGzBinary(archivePath, binaryName, dest)
}

func extractTarGzBinary(archivePath, binaryName, dest string) (string, error) {
	f, err := os.Open(archivePath)
	if err != nil {
		return "", errs.New(errs.KindUnknown, "opening archive", err)
	}
	defer f.Close()

	gz, err := gzip.NewReader(f)
	if err != nil {
		return "", errs.New(errs.KindUnknown, "decompressing archive", err)
	}
	defer gz.Close()

	tr := tar.NewReader(gz)
	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", errs.New(errs.KindUnknown, "reading tar", err)
		}
		if filepath.Base(header.Name) != binaryName {
			continue
		}
		outPath := filepath.Join(dest, binaryName)
		outFile, err := os.OpenFile(outPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
		if err != nil {
			return "", errs.New(errs.KindUnknown, "creating extracted binary", err)
		}
		if _, err := io.Copy(outFile, io.LimitReader(tr, archiveInspectLimit)); err != nil {
			outFile.Close()
			return "", errs.New(errs.KindUnknown, "extracting binary", err)
		}
		outFile.Close()
		return outPath, nil
	}
	return "", errs.New(errs.KindNotFound, fmt.Sprintf("binary %s not found in archive", binaryName), nil)
}

func extractZipBinary(archivePath, binaryName, dest string) (string, error) {
	zr, err := zip.OpenReader(archivePath)
	if err != nil {
		return "", errs.New(errs.KindUnknown, "opening zip", err)
	}
	defer zr.Close()

	for _, entry := range zr.File {
		if filepath.Base(entry.Name) != binaryName {
			continue
		}
		rc, err := entry.Open()
		if err != nil {
			return "", errs.New(errs.KindUnknown, "opening zip entry", err)
		}
		outPath := filepath.Join(dest, binaryName)
		outFile, err := os.OpenFile(outPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
		if err != nil {
			rc.Close()
			return "", errs.New(errs.KindUnknown, "creating extracted binary", err)
		}
		if _, err := io.Copy(outFile, io.LimitReader(rc, archiveInspectLimit)); err != nil {
			rc.Close()
			outFile.Close()
			return "", errs.New(errs.KindUnknown, "extracting binary", err)
		}
		rc.Close()
		outFile.Close()
		return outPath, nil
	}
	return "", errs.New(errs.KindNotFound, fmt.Sprintf("binary %s not found in archive", binaryName), nil)
}

func swapBinary(newBinary, currentBinary string) error {
	if err := os.Chmod(newBinary, 0o755); err != nil {
		return errs.New(errs.KindUnknown, "marking binary executable", err)
	}
	backup := currentBinary + ".old"
	_ = os.Remove(backup)
	if runtime.GOOS == "windows" {
		if err := os.Rename(currentBinary, backup); err != nil {
			return errs.New(errs.KindUnknown, "moving existing binary aside", err)
		}
		if err := os.Rename(newBinary, currentBinary); err != nil {
			_ = os.Rename(backup, currentBinary)
			return errs.New(errs.KindUnknown, "installing new binary", err)
		}
		return nil
	}
	if err := os.Rename(newBinary, currentBinary); err != nil {
		return errs.New(errs.KindUnknown, "installing new binary", err)
	}
	return nil
}

func normalizeVersion(v string) string {
	v = strings.TrimSpace(v)
	v = strings.TrimPrefix(v, tagPrefix)
	v = strings.TrimPrefix(v, "v")
	return v
}

func isValidSemver(v string) bool {
	parts := strings.SplitN(v, "-", 2)
	nums := strings.Split(parts[0], ".")
	if len(nums) != 3 {
		return false
	}
	for _, n := range nums {
		if n == "" {
			return false
		}
		for _, c := range n {
			if c < '0' || c > '9' {
				return false
			}
		}
	}
	return true
}

func pinnedQualifier(pinned string) string {
	if pinned == "" {
		return ""
	}
	return " — pinned"
}

func confirm(cmd *cobra.Command, prompt string) bool {
	fmt.Fprintf(cmd.OutOrStdout(), "%s [y/N]: ", prompt)
	reader := bufio.NewReader(cmd.InOrStdin())
	line, err := reader.ReadString('\n')
	if err != nil {
		return false
	}
	answer := strings.ToLower(strings.TrimSpace(line))
	return answer == "y" || answer == "yes"
}
