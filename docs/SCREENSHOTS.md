# Refresh the illustrated guide

This is a maintainer workflow. People installing the viewer do not need Playwright or the screenshot tools.

The checked-in [user guide](USER_GUIDE.md) is ready to read on GitHub. Open `docs/user-guide.html` in a browser for a standalone preview with the same screenshots and explanations.

## What one capture command does

1. Starts a temporary frontend on an available local port, using the bundled example database.
2. Opens the main screens in Chrome and adds numbered, monochrome callouts to the browser view.
3. Uses demonstration responses for every analysis API request. It does not connect to the real backend, load models, start a run, save settings, resume a job or delete data.
4. Saves PNG images, a capture report, the GitHub Markdown guide and the standalone HTML guide.
5. Closes its browser and the temporary frontend it started, including on a capture error.

The capture aborts when a marker cannot find its control, a page throws a JavaScript error, or an unexpected analysis request occurs. This makes UI changes visible when refreshing the guide.

## First-time preparation

Use an installed frontend checkout with its normal `node_modules` available. Use Node.js 24, as for this repository's other maintainer commands.

The screenshot tool also needs **Playwright** and an installed **Google Chrome** browser. These are documentation tools, not application dependencies. If Playwright is not already available, this optional command installs only the automation package into your working checkout:

```sh
npm install --no-save --package-lock=false playwright
```

The capture script never runs this installation itself and never downloads a browser. If you already have Playwright elsewhere, reuse it with `PLAYWRIGHT_MODULE` pointing to its package directory. Keep machine-specific paths in your shell environment, out of the source files.

PowerShell example:

```powershell
$env:PLAYWRIGHT_MODULE = 'C:/path/to/node_modules/playwright'
npm run docs:capture
```

macOS/Linux example:

```sh
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright npm run docs:capture
```

Without that environment variable, normal package resolution looks for `playwright` in the checkout. Use `--channel msedge` for installed Microsoft Edge, or `--channel chromium` if you already have Playwright's Chromium installed.

## Capture and review

From this frontend repository:

```sh
npm run docs:capture
```

Then open `docs/user-guide.html`. Check the visible controls, numbered markers, image loading and the explanation under each image. Also preview `docs/USER_GUIDE.md` as Markdown.

| Output | Purpose |
| --- | --- |
| `docs/images/guide/*.png` | Numbered screenshots used by both guides. |
| `docs/images/guide/capture.json` | Viewport, example dataset, source revision, captured screens and safety/error checks. |
| `docs/USER_GUIDE.md` | GitHub documentation page. |
| `docs/user-guide.html` | Responsive local preview; opens without a server. |
| `test-results/docs-server.log` | Temporary server diagnostics; ignored by Git. |

If a frontend from this checkout is already running, reuse it instead of starting another:

```sh
npm run docs:capture -- --base-url http://127.0.0.1:3100
```

Use a release checkout for release screenshots. The selected example dataset must exist in the frontend serving that URL. The browser still intercepts analysis API requests, and an existing server is left running afterward. The dataset gallery is restricted to the documented example, so personal imports do not appear in that screenshot.

Development checkouts can reuse the release examples without copying the database. Set `DOCS_DATA_DIR` to the release frontend's `data` directory before running the capture. The temporary frontend and screenshot fixtures both use that directory for reads. With `--base-url`, the existing frontend must already serve the same example dataset.

To recapture one screen while keeping the other PNGs:

```sh
npm run docs:capture -- --only 05-rankings
```

Run a full capture before publishing an updated edition. A single-screen capture report identifies only the screen refreshed in that run.

## Edit the content once

`scripts/docs/guide.mjs` defines the sequence, headings, instructions, selectors, callout explanations and reference tables. Change this source, rather than editing generated Markdown and HTML independently.

`scripts/docs/capture.mjs` navigates the actual application and draws the callouts. `fixtures.mjs` supplies the controlled analysis states. Do not add real backend writes to the workflow.

After a text-only edit, rebuild both documents without launching a browser:

```sh
npm run docs:render
```

This requires the referenced screenshots to exist. If controls move or change names, refresh the affected screenshots too. Keep callout numbers and explanations synchronized by editing the same guide definition.

## Refresh backend defaults

The checked-in `scripts/docs/fixtures/config.json` contains exported public defaults, not anyone's saved configuration. Normal capture does not require a backend checkout.

When the backend adds stages, changes defaults or updates prompt profiles, run its exporter using an existing Python environment:

```sh
python -B /path/to/image-forensics-backend/scripts/export_docs_config.py --output scripts/docs/fixtures/config.json
```

The exporter only imports configuration and prompt definitions. It never reads local settings, keys, run history or model caches. Review the fixture diff, then recapture the guide.

## Publish

Commit the guide source, fixture, generated documents and screenshots together. Both documents use relative image links; keep the `docs/images/guide` folder beside them. The backend README links to this frontend guide so there is one illustrated manual to maintain. Keep the development copy aligned with the release copy when changing this workflow.
