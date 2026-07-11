# Update

Use this page when you already have `moodle` and want the latest stable backend
CLI release. The updater selects stable `moodle-v*` releases that contain the
archive for the current platform plus `checksums.txt`; unrelated iOS releases
are ignored.

## Steps

1. Check whether a newer stable release exists.

```sh
moodle update --check
```

2. Install the newest stable release.

```sh
moodle update
```

3. Confirm the new version.

```sh
moodle version
moodle --version
```
