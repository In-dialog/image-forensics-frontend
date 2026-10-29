# Image Forensics Analysis — Frontend

**[Demo](https://forensic-image-analysis-demo.pages.dev/results/)** · **[Backend repository](https://github.com/In-dialog/image-forensics-backend)**

This repository contains the **web interface and results viewer** for Image Forensics Analysis. It includes a database of example analyses that you can explore immediately after installing.

The frontend runs on Windows or macOS. Viewing saved results works on its own. Creating new analyses also requires the separate backend; see [Install and build both repositories](#install-and-build-both-repositories) at the bottom.

## Features

- **Browse results:** open the included database and your saved analyses.
- **Inspect the image:** explore detected objects, extracted parts, scene context, and available analysis layers.
- **Explore semantics:** view descriptions, configurable labels and rankings, score charts, and clickable clusters.
- **Control new analyses:** with a backend connected, choose stages, edit questions and ranking criteria, and start a run.
- **Follow and recover runs:** see progress, logs, and previews; resume unfinished analyses through the connected backend.

Available views depend on which outputs an analysis contains.

## Frontend requirements

| Your computer | Supported frontend installer |
| --- | --- |
| Windows 10 or newer, 64-bit Intel/AMD or ARM | `Install.cmd` and `Start.cmd` |
| macOS 13.5 or newer, Intel or Apple Silicon | `Install.command` and `Start.command` |

Allow **4 GB of free disk space**, plus space for your saved results. You also need an internet connection for installation and a current web browser.

The installer supplies Node.js 24 when needed, installs the web dependencies, and builds the app. You do not need to install development tools manually. These are the requirements for this frontend; analysis hardware and model setup are documented in the backend repository.

## 1. Download this repository

1. [Download the frontend ZIP](https://github.com/In-dialog/image-forensics-frontend/archive/refs/heads/main.zip), or select **Code → Download ZIP** on this GitHub page.
2. Extract the ZIP into a folder on your computer. On Windows, right-click it and choose **Extract All**; on macOS, open the ZIP.
3. Open the extracted folder containing **Install.cmd** and **Install.command**. Run the steps below from this folder, not from inside the ZIP.

## 2. Install and start the frontend

### Windows

1. Double-click **Install.cmd**. Leave the terminal open while installation and building finish.
2. Wait for **READY. Open Start to launch the website.** Press Enter if prompted.
3. Double-click **Start.cmd**. Keep its terminal window open while using the app.

<details>
<summary>Use PowerShell if a double-clicked window closes too quickly</summary>

Open PowerShell in the extracted frontend folder. Run:

```powershell
.\Install.cmd
```

After installation finishes, run:

```powershell
.\Start.cmd
```

</details>

### macOS

1. Double-click **Install.command**. Wait for Terminal to report **READY**.
2. Press Enter if prompted, then double-click **Start.command**.
3. Keep its Terminal window open while using the app.

<details>
<summary>Use Terminal if macOS will not open the .command file</summary>

Open Terminal, type `cd `, drag the extracted frontend folder into the window, and press Return. Run:

```bash
bash Install.command
```

After installation finishes, run:

```bash
bash Start.command
```

</details>

## 3. Open the viewer

Your browser should open [http://127.0.0.1:3100](http://127.0.0.1:3100). Open that address yourself if it does not.

Select **View database**, open an image, and explore its saved results. The included examples are ready to view. To create a new analysis, follow the combined setup at the bottom.

To stop the frontend, press **Ctrl+C** in its terminal. On Windows, closing the **Start.cmd** terminal also stops the website and its child processes. The separately started backend has its own terminal. Closing the browser tab does not stop the app. To use it again, open **Start**; you do not need to reinstall.

## Saved results and updates

Results are stored in `data/` by default. `.env.local` contains local configuration; `ANALYSIS_DATA_DIR` can select another results folder.

Before updating, stop the app and back up your complete `data/` folder and `.env.local`. Extract the updated frontend into a new folder, restore your data and configuration, then run **Install** and **Start** there. Keep hidden files such as `.import.json` inside each dataset; individual image or JSON files are not a complete saved result.

## Troubleshooting the frontend

| Problem | What to do |
| --- | --- |
| Installation or building stops | Read the final terminal error, check free disk space and your internet connection, then run Install again. |
| Start says the build is incomplete | Run Install and wait for READY before starting. |
| The browser does not open | Visit `http://127.0.0.1:3100` while the Start terminal is open. |
| Port 3100 is already in use | Use the existing frontend instance, or close its terminal before starting another. |
| A copied result is missing | Copy the whole dataset folder, including hidden files, into the configured results directory. |

<details>
<summary>Inspect installation without downloading anything</summary>

Windows PowerShell, in the frontend folder:

```powershell
.\Install.cmd -Preflight
.\Install.cmd -DryRun
```

macOS Terminal, in the frontend folder:

```bash
bash Install.command --preflight
bash Install.command --dry-run
```

These modes inspect compatibility or print the plan without installing or starting the app.

</details>

<details>
<summary>Manual development and production build</summary>

These commands require **Node.js 24 and npm on your terminal's PATH**. They are an alternative to the automatic installer.

Run from this frontend repository:

```bash
npm ci --include=dev
npm run build:local
npm start
```

For development, use `npm run dev`. Checks are `npm test`, `npm run lint`, and `npm run typecheck`. Keep `package-lock.json` and `.npmrc` when copying or updating the source.

</details>

## License

The project's code uses the [MIT license](LICENSE). Bundled media and dependencies retain their own terms; see [third-party and data notes](THIRD_PARTY.md). See [validation notes](docs/VALIDATION.md) for what has been checked.

## Install and build both repositories

Use both projects to analyze new images. To browse saved results, the frontend alone is enough.

### 1. Download both projects first

1. [Download the backend ZIP](https://github.com/In-dialog/image-forensics-backend/archive/refs/heads/main.zip).
2. [Download the frontend ZIP](https://github.com/In-dialog/image-forensics-frontend/archive/refs/heads/main.zip).
3. Extract both ZIPs. Before installing, rename the extracted folders to `image-forensics-backend` and `image-forensics-frontend`. For example:

```text
image-forensics/
  image-forensics-backend/
  image-forensics-frontend/
```

Keep the two folders separate. Do not run either installer from inside a ZIP.

### 2. Install the backend, then build the frontend

**Windows: the automatic setup for both projects**

Use a Windows x64 computer that meets the [backend requirements](https://github.com/In-dialog/image-forensics-backend#backend-requirements). The frontend's Windows ARM support does not extend to the backend.

1. In `image-forensics-backend`, open **Install.cmd**. Complete the model-access prompts and wait for **Setup complete**.
2. In `image-forensics-frontend`, open **Install.cmd**. Wait for **READY**. This installs the frontend dependencies and builds the website automatically.

<details>
<summary>Linux: backend installer and manual frontend build</summary>

Use Linux x64 for the backend and install **Node.js 24 with npm** for the frontend. The frontend's double-click installers are for Windows and macOS; on Linux use these manual commands.

From the parent folder containing both extracted projects:

```bash
cd image-forensics-backend
bash install.sh
cd ../image-forensics-frontend
npm ci --include=dev
npm run build:local
```

</details>

**macOS:** the frontend runs locally, including the saved database viewer. The backend installer does not support macOS, so a Mac alone cannot run this combined local setup. Connecting a Mac frontend to a separate Windows/Linux backend requires a manually configured local tunnel; that advanced setup is outside this walkthrough.

### 3. Start both applications

Keep each application running in its own terminal window:

| Application | Windows | Linux |
| --- | --- | --- |
| Backend: start first, from its folder | Open `Start.cmd` | Run `bash start.sh` |
| Frontend: start second, from its folder | Open `Start.cmd` | Run `npm start` |

Wait for the backend to report `Analysis API: http://127.0.0.1:8766`. Then open the frontend at [http://127.0.0.1:3100](http://127.0.0.1:3100).

### 4. Run an analysis

1. In the frontend, select **New analysis**.
2. Choose an image, select stages, and edit the questions or ranking criteria you need.
3. Select **Start analysis**. The frontend shows the backend's progress, log, and previews.
4. Open the completed result in **View database**. Failed or interrupted runs can be resumed from **Unfinished**.

The frontend sends jobs to the backend through the local API. The backend writes its results to its own `data/` folder; the frontend downloads a separate copy into its own `data/` folder. Saved results remain viewable after the backend stops.

If the frontend says **Backend unavailable**, keep the backend terminal open, check for its API-ready message, and select **Try again**. The default addresses work when both applications run on the same computer.

To stop, press **Ctrl+C** in each application's terminal. Next time, use the two **Start** launchers; installation and building are only needed for initial setup or updates.
