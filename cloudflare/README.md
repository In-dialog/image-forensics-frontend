# Cloudflare database viewer

This build contains the same image viewer and visual analysis components as the local app. The hosted website reads the published dataset catalog and metadata when the gallery opens, with caching disabled. Deleted metadata removes a dataset from the gallery even if an older index still mentions it. Its New analysis page provides setup instructions; it does not send requests to a visitor's computer or require a Python backend.

After installing frontend dependencies, run from the repository root:

```sh
npm run check:cloudflare
npm run build:cloudflare
```

`check:cloudflare` only reads dataset inventories and checks asset limits. `build:cloudflare` prepares the selected viewer assets, then generates static HTML, JavaScript, and data in `cloudflare/out`. It never installs or starts the analysis backend.

In Cloudflare Pages, connect this frontend repository and use:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build:cloudflare` |
| Build output directory | `cloudflare/out` |
| Root directory | Repository root |
| Node.js | 24 LTS (`NODE_VERSION=24`) |

Cloudflare installs frontend dependencies during its build. No Ollama, Hugging Face token, NVIDIA hardware, Python, R2 bucket, or paid Worker runtime is needed for this static viewer. Optional `NEXT_PUBLIC_FRONTEND_REPOSITORY_URL` and `NEXT_PUBLIC_BACKEND_REPOSITORY_URL` environment variables add repository links to the setup guide. They must be public HTTPS URLs, never credentials.

Git integration above is the recommended route. Alternatively, build locally and use Wrangler for **Direct Upload** when you are ready to publish:

```sh
npx wrangler login
npx wrangler pages deploy cloudflare/out
```

Wrangler is downloaded on the machine running that command if needed. This repository does not publish automatically. Keep the output's `_next` and `data` folders together with the generated HTML. The prepared snapshot has about 1,100 files, so use Git integration or Wrangler: the dashboard's drag-and-drop uploader has a lower 1,000-file limit. See [Cloudflare's upload limits](https://developers.cloudflare.com/pages/get-started/direct-upload/#limits).

Only inventory-listed assets used by the viewer are published. Import markers, raw model diagnostics, prompt files, and evidence-board previews are excluded. All exported images and analysis data are public to visitors of this website. To update the database, add completed results to `data` in this repository and rebuild. Runtime imports are available in the separately started local frontend.

The exporter enforces the free Pages limits of 20,000 total files and 25 MiB per file. Its data preflight reserves space for application assets. Larger deployments need a deliberate storage change, such as R2, rather than silently losing assets.

Architecture:

- `app/` contains the small static route adapters.
- `lib/catalog.ts` reads the generated catalog only to preserve direct dataset URLs at build time.
- `lib/loadDatasets.mjs` reads `/data/catalog.json` and verifies current metadata on every gallery load. The client also refreshes when the tab becomes active; unavailable data shows an error, without falling back to a stale list.
- `/results/view/?dataset=...` opens a published dataset without requiring a generated page for its ID.
- `../features/` and `../shared/` contain the shared interface and viewer.
- `../scripts/export-datasets.mjs` publishes validated viewer files and catalog data.
- `../scripts/check-static-export.mjs` checks the final output and required routes.
- `../scripts/finalize-static-export.mjs` normalizes static navigation payload filenames across Windows and Unix builds, then runs the output checks.
- `generated/`, `public/data/`, `.next/`, and `out/` are generated and ignored by Git.

Official references: [Cloudflare Pages static Next.js deployment](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/), [Pages limits](https://developers.cloudflare.com/pages/platform/limits/), and [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports).
