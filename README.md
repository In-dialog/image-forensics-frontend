# Image Forensics Analysis — web interface

**Backend:** [image-forensics-backend](https://github.com/In-dialog/image-forensics-backend)

Explore saved image analyses: detected objects, descriptions, rankings, clusters, and forensic outputs. This repository includes the web interface and a database of example results.

| What you want to do | What to install |
| --- | --- |
| View the included database or previously saved results | This frontend only. |
| Analyze new images | This frontend **and** the separate `image-forensics-backend` project. Follow the backend's hardware and model setup guide as well. |
| Publish a website that displays saved results | Use the [Cloudflare deployment guide](cloudflare/README.md). |

## Before downloading

The automatic frontend installer supports:

- **Windows 10 or newer:** a 64-bit Intel/AMD or ARM computer.
- **macOS 13.5 or newer:** an Intel or Apple Silicon Mac.
- **At least 4 GB of free disk space** for the frontend installation, plus space for your saved results.
- An internet connection for the initial installation and a modern web browser.

You do not need to install Git, Python, Node.js, Ollama, or AI models yourself to view results. No AI GPU or Hugging Face account is needed for the viewer. The installer prepares Node.js 24 when needed, verifies its download, installs the web dependencies, and builds the app. Its private runtime stays inside the project folder; it does not replace your system Node.js installation.

**For new analyses:** check the separate backend's requirements before downloading models. The straightforward local setup runs both projects on the same compatible Windows computer, with an NVIDIA GPU recommended. macOS is supported for the frontend viewer; the complete backend pipeline is not supported on macOS. Connecting a Mac frontend to a Windows/Linux backend on another machine requires an advanced, trusted loopback tunnel. It is not automatic network discovery. The automatic frontend launchers described below support Windows and macOS only.

## Install and start on Windows

1. On this GitHub repository, select **Code → Download ZIP**.
2. Right-click the downloaded ZIP and select **Extract All**. Open the extracted project folder containing `Install.cmd`. Do not run the installer from inside the ZIP.
3. Double-click **Install.cmd**. Keep its window open until it says **READY. Open Start to launch the website.** Installation may take several minutes. Press Enter when prompted to close the installer.
4. Double-click **Start.cmd**. Keep this window open while using the app.
5. Your browser should open [http://127.0.0.1:3100](http://127.0.0.1:3100). If it does not, open that address yourself. Select **View database** to see the included images.

<details>
<summary>Run the Windows launchers from PowerShell instead</summary>

Open PowerShell or Terminal in the extracted project folder. Run installation first:

```powershell
.\Install.cmd
```

After installation finishes, start the app:

```powershell
.\Start.cmd
```

The `.\` prefix means “run the file in this folder.” If a double-clicked window closes unexpectedly, these commands let you read the error.

</details>

## Install and start on macOS

1. On this GitHub repository, select **Code → Download ZIP**.
2. Open the ZIP to extract it. Open the resulting project folder containing `Install.command`.
3. Double-click **Install.command**. Wait until Terminal reports **READY. Open Start to launch the website.**
4. Double-click **Start.command**. Keep its Terminal window open while using the app.
5. Your browser should open [http://127.0.0.1:3100](http://127.0.0.1:3100). Select **View database** to see the included images.

<details>
<summary>If macOS will not open a .command file</summary>

Open Terminal. Type `cd `, including the space, drag the extracted project folder from Finder into Terminal, then press Return. Run:

```bash
bash Install.command
```

Wait for installation to finish, then run:

```bash
bash Start.command
```

These commands run the same supplied launchers and do not require changing your system-wide security settings.

</details>

## Stop, restart, and run a new analysis

To stop the website, select its **Start** terminal window and press **Ctrl+C**. Closing the browser tab alone does not stop it. To use the app again, open **Start.cmd** or **Start.command**; you do not need to reinstall each time.

To analyze a new image:

1. Install the separate backend using its README. Complete its hardware checks, Ollama setup, and Hugging Face model access steps there.
2. Start the backend, then start this frontend on the same computer.
3. Open **New analysis**, choose an image and the stages you want, then select **Start analysis**.
4. Completed results download into this frontend's own `data/` folder. They remain viewable after the backend stops.

If **New analysis** says the backend is unavailable, select **Open setup guide**, or visit the [local setup page](http://127.0.0.1:3100/setup). Start the backend and select **Try again**. The default backend address is `http://127.0.0.1:8766`.

Ollama models and Hugging Face tokens belong to the **backend** setup. Do not put a Hugging Face token into this frontend's settings. The frontend and backend keep separate result folders; they do not need a shared folder.

## Check compatibility without installing

From a terminal in the extracted folder, these commands inspect the computer or show the installation plan without downloads, installation, settings changes, or starting the app.

**Windows PowerShell:**

```powershell
.\Install.cmd -Preflight
.\Install.cmd -DryRun
```

**macOS Terminal:**

```bash
bash Install.command --preflight
bash Install.command --dry-run
```

## Keep your results when updating

Installation preserves the existing `data/` folder and `.env.local` settings file. Before replacing or updating project files:

1. Stop the frontend with **Ctrl+C**.
2. Back up **`data/` and `.env.local`** outside the project folder. If you configured `ANALYSIS_DATA_DIR`, back up that results folder too. Keep each dataset folder intact, including its hidden `.import.json` inventory.
3. Download and extract the newer version into a **new folder**. Keep the old installation until the update works.
4. Restore your backed-up `data/` folder and `.env.local` into the new project folder. On a Mac, press **Command+Shift+.** in Finder to show hidden settings files if needed.
5. Run **Install** in the new folder, then **Start**. Check that your saved results appear before removing any backups or the old installation.

The installer creates `.env.local` from `.env.example` only when no local settings file exists. Most users can leave the defaults unchanged. `ANALYSIS_DATA_DIR` optionally selects a results folder outside this checkout.

## Troubleshooting

| What you see | What to do |
| --- | --- |
| Installer stops during a download or build | Read the last error in its terminal. Check your internet connection and free disk space, then run **Install** again. Your saved results and local settings are preserved. |
| “The website is not installed or its build is incomplete” | Run **Install** and wait for **READY** before opening **Start**. |
| Browser does not open | Keep the Start window open and visit [http://127.0.0.1:3100](http://127.0.0.1:3100) yourself. |
| “Port 3100 is already in use” | The frontend may already be running. Try its browser address first; otherwise stop the earlier Start window with Ctrl+C. |
| “Analysis backend is unavailable” | Saved results still work. Start the separate backend, open the setup guide if needed, and select **Try again**. Installing the frontend does not install the backend. |
| Ollama, GPU, or Hugging Face access error | Follow the backend's setup guide and read its terminal output. These requirements apply to running analyses, not viewing saved results. |
| A copied result does not appear | Copy the complete dataset folder, including `.import.json`, into the configured results directory. Do not copy just an image or individual JSON file. |

## Put the saved database on Cloudflare

Follow the [Cloudflare deployment guide](cloudflare/README.md) for the build settings and upload steps. The hosted site displays saved results without the backend. Its **New analysis** page explains how to install the local app; it cannot automatically connect to a visitor's local backend.

Choose the datasets you intend to publish: exported images and analysis results are available to website visitors. Publishing new results requires rebuilding the static site.

<details>
<summary>Developer commands</summary>

These commands require **Node.js 24 and npm available in your terminal**. The beginner installer may use a private runtime instead, so running it does not necessarily make `npm` available globally.

Install the locked dependencies:

```bash
npm ci --include=dev
```

Start development at `http://127.0.0.1:3100`; stop with Ctrl+C:

```bash
npm run dev
```

Run checks or build the local production app:

```bash
npm test
npm run lint
npm run typecheck
npm run build:local
npm start
```

Static database checks and Cloudflare build:

```bash
npm run check:cloudflare
npm run build:cloudflare
```

Keep `package-lock.json` and `.npmrc` when distributing or updating the source. For a Git checkout, back up results and settings first, update with `git pull --ff-only`, then rerun Install. If Git reports local changes or conflicts, resolve them before proceeding; do not discard your saved data to force an update.

</details>

## License

The project's own code is [MIT licensed](LICENSE). Bundled media and external dependencies retain their own terms; see [third-party and data notes](THIRD_PARTY.md).
