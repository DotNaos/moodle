# Use the CLI locally

Use this page when you want the local `moodle` command instead of Docker.

## Default path

1. Install `moodle`.

macOS / Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/DotNaos/moodle/main/services/moodle/scripts/install.sh | bash
```

The installer uses `/usr/local/bin` when it is writable. Otherwise it prefers a
writable directory under your home folder that is already on `PATH`, then falls
back to `~/.local/bin` and prints a PATH reminder when needed.

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/DotNaos/moodle/main/services/moodle/scripts/install.ps1 | iex
```

2. Open a new shell.

3. Save your login once.

```sh
moodle config set \
  --username "<username>" \
  --password "<password>"
```

4. Log in.

```sh
moodle login
```

You should see `session saved to ...`.

5. Check that it works.

```sh
moodle --json list courses
```

6. If you want the local API next, continue in [Run the API locally](run-api-locally.md).

## Packaged releases

Use this when you do not want the install script. Backend CLI releases use tags
such as `moodle-v0.1.106`, independently from iOS and other app releases.

- macOS: download the matching `moodle_darwin_*.tar.gz`
- Windows: download the matching `moodle_windows_*.zip`
- Linux: download the matching `moodle_linux_*.tar.gz`

Verify the archive against `checksums.txt` before extracting it. The install
scripts perform this verification automatically.

## Build from source

Use this when you want a local Go build:

```sh
git clone https://github.com/DotNaos/moodle.git
cd moodle/services/moodle
go install ./cmd/moodle
```

If your Go bin is not on `PATH`, add it first:

```sh
export PATH="$PATH:$HOME/go/bin"
```
