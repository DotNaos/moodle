package update

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"runtime"
	"strings"
	"time"

	ver "github.com/DotNaos/moodle-services/internal/version"
)

const (
	DefaultOwner         = "DotNaos"
	DefaultRepo          = "moodle"
	ReleaseTagPrefix     = "moodle-v"
	ReleasePageSize      = 100
	ReleaseMaxPages      = 10
	DefaultCheckInterval = 24 * time.Hour
)

var ErrNoStableRelease = errors.New("no stable release published yet")

type Client struct {
	Owner      string
	Repo       string
	BaseURL    string
	HTTPClient *http.Client
}

type Release struct {
	TagName    string         `json:"tag_name"`
	Draft      bool           `json:"draft"`
	Prerelease bool           `json:"prerelease"`
	Assets     []ReleaseAsset `json:"assets"`
}

type ReleaseAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

type Availability struct {
	CurrentVersion string
	LatestTag      string
	NeedsUpdate    bool
}

func NewClient() *Client {
	return &Client{
		Owner:   DefaultOwner,
		Repo:    DefaultRepo,
		BaseURL: "https://api.github.com",
		HTTPClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (c *Client) LatestRelease(ctx context.Context) (Release, error) {
	archiveName, err := CurrentArchiveAssetName()
	if err != nil {
		return Release{}, err
	}
	allReleases := make([]Release, 0, ReleasePageSize)
	for page := 1; page <= ReleaseMaxPages; page++ {
		releases, err := c.releasePage(ctx, page)
		if err != nil {
			return Release{}, err
		}
		allReleases = append(allReleases, releases...)
		if len(releases) < ReleasePageSize {
			break
		}
	}
	return selectLatestBackendRelease(allReleases, archiveName)
}

func (c *Client) releasePage(ctx context.Context, page int) ([]Release, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.releasesURL(page), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "moodle update-check")

	resp, err := c.httpClient().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == http.StatusNotFound {
			return nil, ErrNoStableRelease
		}
		return nil, fmt.Errorf("release check failed: %s", resp.Status)
	}

	var releases []Release
	if err := json.NewDecoder(resp.Body).Decode(&releases); err != nil {
		return nil, err
	}
	return releases, nil
}

func (c *Client) Check(ctx context.Context, currentVersion string) (Availability, Release, error) {
	release, err := c.LatestRelease(ctx)
	if err != nil {
		return Availability{}, Release{}, err
	}

	availability := Availability{
		CurrentVersion: currentVersion,
		LatestTag:      release.TagName,
		NeedsUpdate:    needsUpdate(currentVersion, release.TagName),
	}
	return availability, release, nil
}

func needsUpdate(currentVersion string, latestTag string) bool {
	latest := comparableVersion(latestTag)
	if latest == "" {
		return false
	}
	rawCurrent := strings.TrimSpace(currentVersion)
	if strings.EqualFold(rawCurrent, ver.DefaultVersion) || rawCurrent == "" {
		return true
	}
	current := comparableVersion(rawCurrent)
	cmp, err := ver.Compare(current, latest)
	if err != nil {
		return !strings.EqualFold(current, latest)
	}
	return cmp < 0
}

func comparableVersion(tag string) string {
	trimmed := strings.TrimSpace(tag)
	if trimmed == "" {
		return ""
	}
	trimmed = strings.TrimPrefix(trimmed, "moodle-")
	if !strings.HasPrefix(trimmed, "v") {
		return "v" + trimmed
	}
	return trimmed
}

func ArchiveAssetName(goos string, goarch string) (string, error) {
	switch goos {
	case "darwin", "linux":
		return fmt.Sprintf("moodle_%s_%s.tar.gz", goos, goarch), nil
	case "windows":
		return fmt.Sprintf("moodle_%s_%s.zip", goos, goarch), nil
	default:
		return "", fmt.Errorf("unsupported OS for updates: %s", goos)
	}
}

func CurrentArchiveAssetName() (string, error) {
	return ArchiveAssetName(runtime.GOOS, runtime.GOARCH)
}

func FindAsset(release Release, name string) (ReleaseAsset, error) {
	for _, asset := range release.Assets {
		if asset.Name == name {
			return asset, nil
		}
	}
	return ReleaseAsset{}, fmt.Errorf("release asset not found: %s", name)
}

func ChecksumAsset(release Release) (ReleaseAsset, error) {
	return FindAsset(release, "checksums.txt")
}

func selectLatestBackendRelease(releases []Release, archiveName string) (Release, error) {
	var latest Release
	latestVersion := ""
	for _, release := range releases {
		version, ok := backendReleaseVersion(release)
		if !ok {
			continue
		}
		archive, err := FindAsset(release, archiveName)
		if err != nil || strings.TrimSpace(archive.BrowserDownloadURL) == "" {
			continue
		}
		checksums, err := ChecksumAsset(release)
		if err != nil || strings.TrimSpace(checksums.BrowserDownloadURL) == "" {
			continue
		}
		if latestVersion == "" {
			latest = release
			latestVersion = version
			continue
		}
		comparison, err := ver.Compare(latestVersion, version)
		if err == nil && comparison < 0 {
			latest = release
			latestVersion = version
		}
	}
	if latestVersion == "" {
		return Release{}, ErrNoStableRelease
	}
	return latest, nil
}

func backendReleaseVersion(release Release) (string, bool) {
	if release.Draft || release.Prerelease || !strings.HasPrefix(release.TagName, ReleaseTagPrefix) {
		return "", false
	}
	version := strings.TrimPrefix(release.TagName, "moodle-")
	parsed, err := ver.ParseSemver(version)
	if err != nil || parsed.Prerelease != "" {
		return "", false
	}
	return version, true
}

func (c *Client) releasesURL(page int) string {
	base := strings.TrimRight(c.BaseURL, "/")
	if base == "" {
		base = "https://api.github.com"
	}
	return fmt.Sprintf("%s/repos/%s/%s/releases?per_page=%d&page=%d", base, c.Owner, c.Repo, ReleasePageSize, page)
}

func (c *Client) httpClient() *http.Client {
	if c.HTTPClient != nil {
		return c.HTTPClient
	}
	return http.DefaultClient
}
