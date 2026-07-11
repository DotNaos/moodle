#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLER="${SCRIPT_DIR}/install.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
case "$(uname -m)" in
  x86_64|amd64) ARCH="amd64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) ARCH="$(uname -m)" ;;
esac
ASSET="moodle_${OS}_${ARCH}.tar.gz"
TAG="moodle-v1.2.3"
RELEASE_DIR="${TMP_DIR}/releases/${TAG}"
RELEASE_METADATA_DIR="${TMP_DIR}/release-api"
mkdir -p "$RELEASE_DIR" "$RELEASE_METADATA_DIR" "${TMP_DIR}/archive"

cat > "${TMP_DIR}/archive/moodle" <<'FAKE_MOODLE'
#!/usr/bin/env bash
if [[ "${1:-}" == "--version" ]]; then
  echo "moodle version 1.2.3"
  exit 0
fi
echo "fake moodle"
FAKE_MOODLE
chmod 755 "${TMP_DIR}/archive/moodle"
tar -czf "${RELEASE_DIR}/${ASSET}" -C "${TMP_DIR}/archive" moodle

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$RELEASE_DIR" && sha256sum "$ASSET" > checksums.txt)
else
  (cd "$RELEASE_DIR" && shasum -a 256 "$ASSET" > checksums.txt)
fi

write_release_metadata() {
  local tag="$1"
  local prerelease="$2"
  local include_archive="$3"
  local archive_metadata=""
  if [[ "$include_archive" == "true" ]]; then
    archive_metadata="{\"browser_download_url\": \"file://${TMP_DIR}/releases/${tag}/${ASSET}\"},"
  fi
  cat > "${RELEASE_METADATA_DIR}/${tag}" <<JSON
{
  "tag_name": "${tag}",
  "draft": false,
  "prerelease": ${prerelease},
  "assets": [
    ${archive_metadata}
    {"browser_download_url": "file://${TMP_DIR}/releases/${tag}/checksums.txt"}
  ]
}
JSON
}

write_release_metadata "$TAG" false true

PRERELEASE_TAG="moodle-v9.0.0"
mkdir -p "${TMP_DIR}/releases/${PRERELEASE_TAG}"
cp "${RELEASE_DIR}/${ASSET}" "${TMP_DIR}/releases/${PRERELEASE_TAG}/${ASSET}"
cp "${RELEASE_DIR}/checksums.txt" "${TMP_DIR}/releases/${PRERELEASE_TAG}/checksums.txt"
write_release_metadata "$PRERELEASE_TAG" true true

INCOMPLETE_TAG="moodle-v8.0.0"
mkdir -p "${TMP_DIR}/releases/${INCOMPLETE_TAG}"
cp "${RELEASE_DIR}/checksums.txt" "${TMP_DIR}/releases/${INCOMPLETE_TAG}/checksums.txt"
write_release_metadata "$INCOMPLETE_TAG" false false

{
  echo '['
  for ((index = 1; index <= 100; index++)); do
    suffix=','
    if [[ "$index" == "100" ]]; then
      suffix=''
    fi
    printf '  {"tag_name":"ios-%d","draft":false,"prerelease":false,"assets":[]}%s\n' "$index" "$suffix"
  done
  echo ']'
} > "${TMP_DIR}/releases-page-1.json"

cat > "${TMP_DIR}/releases-page-2.json" <<JSON
[
  {"tag_name":"ios-999","draft":false,"prerelease":false,"assets":[{"name":"moodle-client.ipa"}]},
  {"tag_name":"${PRERELEASE_TAG}","draft":false,"prerelease":true,"assets":[{"name":"${ASSET}"},{"name":"checksums.txt"}]},
  {"tag_name":"${INCOMPLETE_TAG}","draft":false,"prerelease":false,"assets":[{"name":"checksums.txt"}]},
  {"tag_name":"${TAG}","draft":false,"prerelease":false,"assets":[{"name":"${ASSET}"},{"name":"checksums.txt"}]}
]
JSON

run_installer() {
  local install_dir="$1"
  shift
  local output
  if ! output="$(
    INSTALL_DIR="$install_dir" \
      MOODLE_RELEASES_API_URL="file://${TMP_DIR}/releases-page-{page}.json" \
      MOODLE_RELEASE_TAG_API_URL="file://${RELEASE_METADATA_DIR}" \
      MOODLE_RELEASE_DOWNLOAD_BASE_URL="file://${TMP_DIR}/releases" \
      "$@" \
      bash "$INSTALLER"
  )"; then
    return 1
  fi
  printf '%s\n' "$output"
  grep -Fq "Installed Moodle CLI ${TAG} " <<< "$output"
  "$install_dir/moodle" --version | grep -Fq "1.2.3"
}

run_installer "${TMP_DIR}/latest-install" env
run_installer "${TMP_DIR}/explicit-install" env VERSION=v1.2.3

cp "${RELEASE_DIR}/checksums.txt" "${RELEASE_DIR}/checksums.valid.txt"
printf '%064d  %s\n' 0 "$ASSET" > "${RELEASE_DIR}/checksums.txt"
if run_installer "${TMP_DIR}/invalid-install" env VERSION="$TAG" >/dev/null 2>&1; then
  echo "installer accepted an invalid checksum" >&2
  exit 1
fi
mv "${RELEASE_DIR}/checksums.valid.txt" "${RELEASE_DIR}/checksums.txt"

echo "install script tests passed"
