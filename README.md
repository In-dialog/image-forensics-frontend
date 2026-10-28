# Image Forensics Analysis — web interface

Explore image regions, descriptions, rankings, clusters and forensic outputs. The saved database works without the analysis backend. The same components support a local analysis interface and a standalone Cloudflare-hosted viewer.

## Use it on your computer

1. Download this repository using **Code → Download ZIP** on GitHub and extract it. Do not run it inside the ZIP.
2. **Windows:** double-click **Install.cmd**. **Mac:** double-click **Install.command**. Keep the window open until setup reports completion.
3. Double-click **Start.cmd** on Windows or **Start.command** on Mac. The app opens at **http://127.0.0.1:3100**.
4. Choose **View database** to explore the included results. To create new results, install/start the separate backend; **New analysis → Setup guide** explains each step.

The installer prepares Node.js 24 if necessary, verifies its download checksum, installs the locked web dependencies and builds the site. No Python, GPU, Ollama, Hugging Face account, Git command or AI model download is needed just to view results. Allow at least 4 GB free disk space for web dependencies/builds.

Supported local systems: Windows 10 or newer (64-bit), and macOS 13.5 or newer (Intel or Apple Silicon). If macOS refuses to run a downloaded script, open Terminal in the extracted folder and run `bash Install.command`, then `bash Start.command`. Keep the start terminal open while using the application; press Ctrl+C to stop it.

Installation preserves `data/` and `.env.local`. The project uses an isolated runtime in `.runtime/` when it needs its own Node.js; it does not replace your system Node installation. Install does not start the server.

## Check setup without downloading anything

```powershell
Install.cmd -Preflight
Install.cmd -DryRun
```

```sh
bash Install.command --preflight
bash Install.command --dry-run
```

These commands only inspect/report the plan. They do not download dependencies, install a runtime, modify saved settings, or start a server.

## Run new analyses

The backend is a separate Windows/Linux application with its own hardware requirements and model setup. Start it first, then use this website's **New analysis** page. When the engine is unavailable, the page provides a setup guide and a retry action.

The local site connects to `http://127.0.0.1:8766` through server routes. The backend produces results, and the web app downloads completed results into its own `data/` directory. There is **no shared-folder dependency**. The website continues to display downloaded results after the engine stops.

Backend access is intentionally local. A Mac can use the standalone viewer; running analyses against a different Windows/Linux computer needs a trusted loopback tunnel and is an advanced configuration, not automatic network discovery.

Copy `.env.example` to `.env.local` only if you need custom settings. `ANALYSIS_DATA_DIR` can point to a private directory outside this repository for future imports. Keep tokens and backend credentials out of frontend variables.

## Publish the saved database on Cloudflare

The bundled database is included in this repository. The Cloudflare target creates a static site containing the viewer and required data assets; it does not need a GPU backend, a writable server disk or a database service.

In Cloudflare Pages, connect this repository and use:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Root directory | Repository root |
| Build command | `npm run build:cloudflare` |
| Build output directory | `cloudflare/out` |
| Environment variable | `NODE_VERSION=24` |

The hosted **New analysis** page shows installation guidance. Actual analysis and result imports run through the local app. To publish additional saved results, update the selected database and rebuild the static site.

See [Cloudflare deployment](cloudflare/README.md) for limits, data selection, local build commands and direct-upload instructions. Publishing makes the chosen image/analysis files available to visitors; the exporter omits job state, model prompts and diagnostic evidence files.

## Repository layout

| Directory | Purpose |
| --- | --- |
| `app` | Local Next.js routes and API handlers. |
| `features/analysis` | Analysis configuration, jobs, progress, resume and recovery UI. |
| `features/results` | Reusable dataset viewer, semantics and graphics. |
| `features/setup` | Shared beginner setup guide and backend availability guidance. |
| `shared` | Application identity, navigation and shared components. |
| `server/analysis` | Loopback API proxy and validated result import. |
| `cloudflare/app` | Static route entrypoints using the same feature components. |
| `scripts` | Dataset export and static-publication checks. |
| `install` | Windows/macOS bootstrap, installation planning and local start. |
| `data` | Bundled saved results with explicit file inventories. |

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build:local
npm run check:cloudflare
npm run build:cloudflare
```

`package-lock.json` and `.npmrc` are part of the dependency contract. Keep them when distributing the source. Installer tests do not perform downloads or start services.

## License

The project's own code is [MIT licensed](LICENSE). Bundled media and external dependencies are not relicensed by the source-code license; see [third-party and data notes](THIRD_PARTY.md).
