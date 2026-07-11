#!/usr/bin/env bash
set -euo pipefail

OWNER="DotNaos"
REPO="moodle"
RELEASE_TAG_PREFIX="moodle-v"
VERSION="${VERSION:-latest}"
if [[ -n "${INSTALL_DIR:-}" ]]; then
  INSTALL_DIR="$INSTALL_DIR"
elif [[ -d /usr/local/bin && -w /usr/local/bin ]]; then
  INSTALL_DIR="/usr/local/bin"
else
  INSTALL_DIR=""
  case ":${PATH:-}:" in
    *":${HOME}/.local/bin:"*) INSTALL_DIR="$HOME/.local/bin" ;;
  esac
  if [[ -z "$INSTALL_DIR" ]]; then
    IFS=: read -r -a path_dirs <<< "${PATH:-}"
    for path_dir in "${path_dirs[@]}"; do
      case "$path_dir" in
        "$HOME"/*)
          if [[ -d "$path_dir" && -w "$path_dir" ]]; then
            INSTALL_DIR="$path_dir"
            break
          fi
          ;;
      esac
    done
  fi
  INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
fi
CHECKSUM_FILE="checksums.txt"
RELEASES_API_URL_OVERRIDE="${MOODLE_RELEASES_API_URL:-}"
RELEASES_API_URL="${MOODLE_RELEASES_API_URL:-https://api.github.com/repos/${OWNER}/${REPO}/releases?per_page=100}"
RELEASE_TAG_API_URL="${MOODLE_RELEASE_TAG_API_URL:-https://api.github.com/repos/${OWNER}/${REPO}/releases/tags}"
RELEASE_DOWNLOAD_BASE_URL="${MOODLE_RELEASE_DOWNLOAD_BASE_URL:-https://github.com/${OWNER}/${REPO}/releases/download}"
INSTALL_TMP_DIR=""

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

download() {
  local url="$1"
  local output="$2"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$output"
    return
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -qO "$output" "$url"
    return
  fi

  echo "Either curl or wget is required." >&2
  exit 1
}

try_download() {
  local url="$1"
  local output="$2"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$output" 2>/dev/null
    return
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -qO "$output" "$url" 2>/dev/null
    return
  fi

  echo "Either curl or wget is required." >&2
  exit 1
}

sha256_file() {
  local file="$1"

  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
    return
  fi
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
    return
  fi

  echo "Either sha256sum or shasum is required." >&2
  exit 1
}

normalize_os() {
  case "$(uname -s)" in
    Darwin) echo "darwin" ;;
    Linux) echo "linux" ;;
    *)
      echo "Unsupported OS: $(uname -s)" >&2
      exit 1
      ;;
  esac
}

normalize_arch() {
  case "$(uname -m)" in
    x86_64|amd64) echo "amd64" ;;
    arm64|aarch64) echo "arm64" ;;
    *)
      echo "Unsupported architecture: $(uname -m)" >&2
      exit 1
      ;;
  esac
}

normalize_version() {
  local version="$1"
  case "$version" in
    ${RELEASE_TAG_PREFIX}*) ;;
    v*) version="moodle-${version}" ;;
    [0-9]*) version="${RELEASE_TAG_PREFIX}${version}" ;;
    *)
      echo "Invalid Moodle CLI release version: ${version}" >&2
      exit 1
      ;;
  esac
  if [[ ! "$version" =~ ^moodle-v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
    echo "Invalid Moodle CLI release tag: ${version}" >&2
    exit 1
  fi
  printf '%s\n' "$version"
}

version_sort_key() {
  local version="${1#${RELEASE_TAG_PREFIX}}"
  local major minor patch
  IFS=. read -r major minor patch <<< "$version"
  printf '%010d.%010d.%010d\n' "$major" "$minor" "$patch"
}

release_page_url() {
  local page="$1"
  if [[ -n "$RELEASES_API_URL_OVERRIDE" ]]; then
    if [[ "$RELEASES_API_URL" == *"{page}"* ]]; then
      printf '%s\n' "${RELEASES_API_URL//\{page\}/$page}"
      return
    fi
    if (( page > 1 )); then
      return 1
    fi
    printf '%s\n' "$RELEASES_API_URL"
    return
  fi
  printf '%s&page=%d\n' "$RELEASES_API_URL" "$page"
}

resolve_latest_version() {
  local release_file="$1"
  local asset="$2"
  local tmp_dir="$3"
  local candidates_file="${tmp_dir}/release-candidates.txt"
  local page=1
  : > "$candidates_file"

  while (( page <= 10 )); do
    local page_url
    if ! page_url="$(release_page_url "$page")"; then
      break
    fi
    if ! try_download "$page_url" "$release_file"; then
      if (( page == 1 )); then
        echo "Could not load Moodle releases." >&2
        exit 1
      fi
      break
    fi

    local versions
    versions="$(grep -Eo '"tag_name"[[:space:]]*:[[:space:]]*"moodle-v[0-9]+\.[0-9]+\.[0-9]+"' "$release_file" \
      | sed -E 's/.*"(moodle-v[0-9]+\.[0-9]+\.[0-9]+)"/\1/' \
      || true)"
    while IFS= read -r version; do
      [[ -n "$version" ]] || continue
      local key
      key="$(version_sort_key "$version")"
      printf '%s %s\n' "$key" "$version" >> "$candidates_file"
    done <<< "$versions"

    if [[ -n "$RELEASES_API_URL_OVERRIDE" && "$RELEASES_API_URL" != *"{page}"* ]]; then
      break
    fi
    local release_count
    release_count="$( (grep -Eo '"tag_name"[[:space:]]*:' "$release_file" || true) | wc -l | tr -d '[:space:]')"
    if (( release_count < 100 )); then
      break
    fi
    page=$((page + 1))
  done

  local key version
  while read -r key version; do
    [[ -n "$version" ]] || continue
    local release_metadata="${tmp_dir}/release-${version}.json"
    if ! try_download "${RELEASE_TAG_API_URL}/${version}" "$release_metadata"; then
      continue
    fi
    if ! grep -Eq '^[[:space:]]*"draft"[[:space:]]*:[[:space:]]*false,?[[:space:]]*$' "$release_metadata" \
      || ! grep -Eq '^[[:space:]]*"prerelease"[[:space:]]*:[[:space:]]*false,?[[:space:]]*$' "$release_metadata" \
      || ! grep -Fq "\"tag_name\": \"${version}\"" "$release_metadata" \
      || ! grep -Fq "\"browser_download_url\": \"${RELEASE_DOWNLOAD_BASE_URL}/${version}/${asset}\"" "$release_metadata" \
      || ! grep -Fq "\"browser_download_url\": \"${RELEASE_DOWNLOAD_BASE_URL}/${version}/${CHECKSUM_FILE}\"" "$release_metadata"; then
      continue
    fi

    local candidate_checksums="${tmp_dir}/checksums-${version}.txt"
    if ! try_download "${RELEASE_DOWNLOAD_BASE_URL}/${version}/${CHECKSUM_FILE}" "$candidate_checksums"; then
      continue
    fi
    if ! awk -v asset="$asset" 'NF == 2 { name = $2; sub(/^\*/, "", name); if (name == asset) found = 1 } END { exit !found }' "$candidate_checksums"; then
      continue
    fi
    printf '%s\n' "$version"
    return
  done < <(LC_ALL=C sort -r "$candidates_file" | awk '!seen[$2]++')

  echo "No stable Moodle CLI release was found." >&2
  exit 1
}

main() {
  require_cmd tar
  require_cmd awk
  require_cmd grep
  require_cmd sed
  require_cmd sort

  local os
  os="$(normalize_os)"
  local arch
  arch="$(normalize_arch)"
  local asset="moodle_${os}_${arch}.tar.gz"

  INSTALL_TMP_DIR="$(mktemp -d)"
  local tmp_dir="$INSTALL_TMP_DIR"
  trap '[[ -z "${INSTALL_TMP_DIR:-}" ]] || rm -rf "$INSTALL_TMP_DIR"' EXIT

  local resolved_version
  if [[ "$VERSION" == "latest" ]]; then
    resolved_version="$(resolve_latest_version "${tmp_dir}/releases.json" "$asset" "$tmp_dir")"
  else
    resolved_version="$(normalize_version "$VERSION")"
  fi
  local base_url="${RELEASE_DOWNLOAD_BASE_URL}/${resolved_version}"

  mkdir -p "$INSTALL_DIR"

  download "${base_url}/${asset}" "${tmp_dir}/${asset}"
  download "${base_url}/${CHECKSUM_FILE}" "${tmp_dir}/${CHECKSUM_FILE}"

  local expected
  expected="$(awk -v asset="$asset" 'NF == 2 { name = $2; sub(/^\*/, "", name); if (name == asset) { print $1; exit } }' "${tmp_dir}/${CHECKSUM_FILE}")"
  if [[ -z "$expected" ]]; then
    echo "Could not find checksum for ${asset}." >&2
    exit 1
  fi

  local actual
  actual="$(sha256_file "${tmp_dir}/${asset}")"
  if [[ "$expected" != "$actual" ]]; then
    echo "Checksum verification failed for ${asset}." >&2
    exit 1
  fi

  tar -xzf "${tmp_dir}/${asset}" -C "$tmp_dir"
  cp "${tmp_dir}/moodle" "${INSTALL_DIR}/moodle"
  chmod 755 "${INSTALL_DIR}/moodle"

  echo "Installed Moodle CLI ${resolved_version} to ${INSTALL_DIR}/moodle"
  case ":$PATH:" in
    *":${INSTALL_DIR}:"*) ;;
    *)
      echo "Add ${INSTALL_DIR} to your PATH if it is not already there." >&2
      ;;
  esac
}

main "$@"
