# Release preparation checks

## Backend HTTP transport regression checks (2026-11-24)

The frontend uses native Node HTTP streams for backend JSON requests, uploads, previews and result downloads. This avoids the bundled Undici `Parser.finish` assertion when an HTTP/1.0 connection closes while a consumer is paused ([upstream issue](https://github.com/nodejs/undici/issues/5360)). Response streams remain bounded, cancellable and subject to the existing request timeouts; imported files still require their declared byte counts and SHA-256 hashes.

All 79 frontend tests passed on the installed Node 24.22.3 runtime. Seven new real-socket tests cover paused downloads, truncated responses, binary/JSON uploads, aborts and cancellation, loopback addresses and redirects, interrupted import cleanup/retry, and preview responses. TypeScript and ESLint for the changed code also passed. These checks use local fixtures without running AI models or changing saved analyses.

The default Turbopack production build also passed. After restarting the local frontend, live checks returned HTTP 200 for the home page, backend health/configuration, the completed job and its result page. All 24 saved previews streamed successfully to a deliberately slow reader, the completed-result import retry succeeded, and the frontend error log remained empty. No model analysis was rerun.

## Original release preparation

The release was checked without downloading/installing Node, npm packages, browsers or AI models. Existing development dependencies were temporarily reused, then detached from this source folder.

- 65 frontend tests passed, including dataset access/export and offline Windows/macOS installer planning and path-safety tests.
- After final publication hardening, all 9 exporter tests passed, including two additional regressions for provenance-path redaction and byte-for-byte preservation of safe JSON. The checked bundled data was unchanged, so the existing deployment artifact remains valid.
- TypeScript passed. Full ESLint completed with no errors and 18 existing warnings.
- Local and static production builds passed using Next's webpack builder. The temporary dependency junction cannot be used by Turbopack, so the default Turbopack build is left for normal installations and the prepared Linux CI workflow.
- The static build includes 18 routes, covering all 11 bundled datasets. Export checks validate file inventories, safe paths, private-file exclusions, and hosting asset limits.
- Offline Chromium checks exercised desktop/mobile navigation, setup, gallery, dataset views and dataset switching. All requests were intercepted from generated files; no HTTP service or backend was started and no external requests were made.
- The initial source/database package was scanned for developer-machine paths, obvious credential formats, model weights and installed-runtime directories.

The deployment artifact contains about 12.6 MiB of site/data assets. The source database contains 889 viewer assets, about 9.6 MiB, plus private inventory markers used by the local importer/exporter. Model prompts and unused diagnostic images are excluded.

Fresh Node 24 installation, native macOS execution, and a complete model-analysis run through the frontend remain outside these local checks. CI is configured for Node 24 on Windows, macOS, and Linux. The README's demo link provides access to the published results viewer.
