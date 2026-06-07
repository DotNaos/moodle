# Study bundles

This folder contains manually imported course material bundles for the Moodle web app.

Bundles are read at runtime and are not regenerated during page loads. To refresh a bundle, run:

```sh
bun run study:import /Users/oli/school/terms/FS26/courses/high-performance-computing high-performance-computing
```

Each bundle keeps the curated `script/`, `tasks/`, machine `.extracted/` files, lightweight `.raw/` indexes, embedded assets, and a generated `manifest.json`.
