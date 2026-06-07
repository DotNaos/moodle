const DEFAULT_MOBILE_CLIENT_DOWNLOAD_URL =
  "https://expo.dev/accounts/omiq/projects/moodle-client";

export function getMobileClientDownloadUrl(): string {
  return (
    process.env.NEXT_PUBLIC_MOODLE_CLIENT_DOWNLOAD_URL?.trim() ||
    DEFAULT_MOBILE_CLIENT_DOWNLOAD_URL
  );
}
