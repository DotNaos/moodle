# Study bundles

This folder is only a local escape hatch for manually imported course material.
Generated study material should normally live on the VPS and be served through
`moodle-services`, not be committed into the web app source tree.

The web app now uses the `moodle-services` study pipeline as the normal source
for generated script and task views. If a file-backed bundle store is needed
for local debugging, set `STUDY_BUNDLES_ROOT` to an external directory and put
generated bundles there.

To refresh a local bundle manually, run:

```sh
bun run study:import /Users/oli/school/terms/FS26/courses/high-performance-computing high-performance-computing
```

Each bundle keeps the curated `script/`, `tasks/`, machine `.extracted/` files, lightweight `.raw/` indexes, embedded assets, and a generated `manifest.json`.
