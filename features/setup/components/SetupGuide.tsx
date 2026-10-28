import Link from 'next/link';
import styles from '../setup.module.css';

function repositoryLink(value: string | undefined) {
  if (!value) return undefined;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : undefined; }
  catch { return undefined; }
}

const frontendRepository = repositoryLink(process.env.NEXT_PUBLIC_FRONTEND_REPOSITORY_URL);
const backendRepository = repositoryLink(process.env.NEXT_PUBLIC_BACKEND_REPOSITORY_URL);

function DownloadRepository({ href, name }: { href?: string; name: string }) {
  return <p>{href ? <a href={href} target="_blank" rel="noreferrer">Open the {name} repository ↗</a>
    : <>Open the separate <strong>image-forensics-{name}</strong> repository supplied with this project.</>}
    {' '}Choose <strong>Code → Download ZIP</strong>, then extract the ZIP into a normal folder before opening the installer.</p>;
}

/** One guide for an offline backend and the hosted, read-only viewer. */
export function SetupGuide({ hosted = false }: { hosted?: boolean }) {
  return <article className={styles.guide}>
    <header className={styles.heading}>
      <span className={styles.eyebrow}>{hosted ? 'Hosted database viewer' : 'Installation guide'}</span>
      <h1>{hosted ? 'Run a new analysis on your computer' : 'Set up Image Forensics Analysis'}</h1>
      <p>{hosted
        ? 'This website displays saved results. New analyses run in the local app with a separate analysis backend.'
        : 'The viewer and the analysis backend install separately. You can explore saved results without installing AI models.'}</p>
      <div className={styles.actions}>
        <Link href="/results" className={styles.primary}>View database</Link>
        {!hosted && <Link href="/analysis" className={styles.secondary}>Return to analysis</Link>}
      </div>
    </header>

    <nav className={styles.contents} aria-label="Installation steps">
      <a href="#computer">1 · Check your computer</a>
      <a href="#viewer">2 · Install the viewer</a>
      <a href="#backend">3 · Add the backend</a>
      <a href="#connect">4 · Start an analysis</a>
    </nav>

    <section id="computer" className={styles.section}>
      <h2><span>01</span> Check your computer</h2>
      <div className={styles.tableWrap}>
        <table>
          <thead><tr><th>What you need</th><th>Computer</th><th>Additional setup</th></tr></thead>
          <tbody>
            <tr><th>View saved results</th><td>Windows or macOS; Linux also supported</td><td>Modern browser. The installer supplies Node.js when needed. No Python, Hugging Face account, or AI GPU required.</td></tr>
            <tr><th>Run analyses</th><td>Windows or Linux with an NVIDIA GPU recommended</td><td>Python environment, compatible NVIDIA driver, Ollama, and access to the SAM 3 model on Hugging Face. The backend installer checks compatibility.</td></tr>
            <tr><th>CPU-only analysis</th><td>Windows or Linux, using the explicit CPU profile</td><td>Much slower and dependent on model memory requirements. GPU-only stages must remain disabled.</td></tr>
            <tr><th>macOS</th><td>Supported for the viewer</td><td>The complete backend pipeline is not supported on macOS. Use a compatible Windows/Linux machine for analysis.</td></tr>
          </tbody>
        </table>
      </div>
      <p className={styles.note}>AI model downloads are large and require free disk space, RAM, and GPU memory. The backend installer shows its plan before installation; available memory determines which model sizes are practical.</p>
    </section>

    <section id="viewer" className={styles.section}>
      <h2><span>02</span> Install the viewer</h2>
      <DownloadRepository href={frontendRepository} name="frontend" />
      <ol className={styles.steps}>
        <li><strong>Windows:</strong> double-click <code>Install.cmd</code>. <strong>macOS:</strong> open <code>Install.command</code>. If macOS blocks a downloaded file, follow the included README instructions for that file.</li>
        <li>Follow the installer&apos;s checks and progress until it reports completion. It downloads the viewer&apos;s dependencies and builds the app.</li>
        <li>Open <code>Start.cmd</code> on Windows or <code>Start.command</code> on macOS. Keep its terminal open while you use the app.</li>
        <li>Open <a href="http://127.0.0.1:3100">http://127.0.0.1:3100</a> in your browser. Select <strong>View database</strong> to explore the included results.</li>
      </ol>
    </section>

    <section id="backend" className={styles.section}>
      <h2><span>03</span> Add the analysis backend</h2>
      <DownloadRepository href={backendRepository} name="backend" />
      <ol className={styles.steps}>
        <li>On Windows, open <code>Install.cmd</code>. On Linux, run <code>bash install.sh</code> from the extracted backend folder. Choose the standard NVIDIA profile, or explicitly choose CPU if you do not have a compatible GPU.</li>
        <li>Install <a href="https://ollama.com/download" target="_blank" rel="noreferrer">Ollama ↗</a> when prompted. Ollama runs the vision language model locally; downloading the app and downloading a model are separate steps.</li>
        <li>Create a <a href="https://huggingface.co/join" target="_blank" rel="noreferrer">Hugging Face account ↗</a> and request access to <a href="https://huggingface.co/facebook/sam3" target="_blank" rel="noreferrer">facebook/sam3 ↗</a>. Accept its terms with that account. Approval is controlled by the model owner.</li>
        <li>Create a token with read access in <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer">Hugging Face settings ↗</a> and enter it only in the backend&apos;s local setup prompt. Never put the token in this website or commit it to Git.</li>
        <li>Let the backend installer check model access and install the selected dependencies. Keep optional native forgery and synthetic-analysis extras disabled unless you have completed their separate setup.</li>
      </ol>
      <details className={styles.details}>
        <summary>About hardware, drivers, and model downloads</summary>
        <p>A GPU&apos;s memory is different from your computer&apos;s RAM. An NVIDIA name alone does not guarantee enough memory for the selected vision and segmentation models. Close other GPU-heavy applications and use the backend&apos;s compatibility check before downloading.</p>
        <p>The PyTorch GPU package and your NVIDIA driver must be compatible. Install or update the driver using NVIDIA&apos;s official instructions; the installer does not replace system drivers. CPU mode cannot make GPU-only add-ons compatible.</p>
        <p>Hugging Face access errors usually mean the account has not been granted access, the model terms have not been accepted, or the local token belongs to a different account. Ollama model files and Hugging Face caches stay on the machine that runs the backend.</p>
      </details>
    </section>

    <section id="connect" className={styles.section}>
      <h2><span>04</span> Start an analysis</h2>
      <ol className={styles.steps}>
        <li>Start the backend using <code>Start.cmd</code> on Windows or <code>bash start.sh</code> on Linux. It starts Ollama when needed.</li>
        <li>Start the frontend on the same computer and open <a href="http://127.0.0.1:3100/analysis">the local New analysis page</a>.</li>
        <li>Choose an image, select the stages you need, and select <strong>Start analysis</strong>. Progress and previews appear while it runs.</li>
        <li>Completed results download into the frontend&apos;s own <code>data</code> folder. You can view them after stopping the backend.</li>
      </ol>
      {hosted && <p className={styles.note}>Starting your backend does not connect it to this hosted website. Use the local frontend for analysis. To update the hosted database, publish a new static build with your selected saved datasets.</p>}
      <details className={styles.details}>
        <summary>The local app still cannot find the backend</summary>
        <p>Keep the backend terminal open and check its last error. The default API address is <code>http://127.0.0.1:8766</code>. The frontend and backend must run on the same computer with their default ports, or the local frontend&apos;s <code>ANALYSIS_API_URL</code> must match the backend&apos;s port.</p>
        <p>Return to New analysis and select <strong>Try again</strong>. Saved results remain available even when the backend is stopped.</p>
      </details>
    </section>
  </article>;
}
