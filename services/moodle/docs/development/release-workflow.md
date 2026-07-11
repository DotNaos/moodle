# Release workflow

Use this page when you want to know how stable releases and container images are produced.

## Stable CLI release path

1. Push the finished change to `main`.
2. Create and push a backend tag such as `moodle-v0.1.106`.
3. The `Backend Release` workflow runs the backend tests and GoReleaser.
4. Open-source GoReleaser receives a local `v0.1.106` alias because prefixed
   monorepo tags are not plain semantic versions.
5. The workflow publishes the generated files to the original
   `moodle-v0.1.106` GitHub release.
6. A clean Debian amd64 container installs the release, runs `moodle --version`,
   and checks the updater before container images are published.

## Release outputs

- Stable CLI tags such as `moodle-v0.1.106`
- `moodle_linux_amd64.tar.gz` and `moodle_linux_arm64.tar.gz`
- `moodle_darwin_amd64.tar.gz` and `moodle_darwin_arm64.tar.gz`
- Windows amd64 and arm64 ZIP archives
- `checksums.txt`
- `ghcr.io/dotnaos/moodle:latest`

The CLI installer and updater ignore iOS releases and any backend release that
lacks the current platform archive or checksum file.

## Unstable channel

Prerelease tags must use a suffix, for example
`moodle-v0.1.107-rc.1`. They are published as prereleases and are not selected
by the stable installer or updater.

## Local checks before release

```sh
go test ./...
GORELEASER_CURRENT_TAG=v0.1.106 goreleaser release --snapshot --clean
docker build -t ghcr.io/dotnaos/moodle .
```
