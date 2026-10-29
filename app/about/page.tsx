import { WorkspaceShell } from "@/features/workspace/components/WorkspaceShell";
import styles from "@/features/setup/setup.module.css";

export default function AboutPage() {
  return (
    <WorkspaceShell active="about">
      <article className={styles.guide}>
        <header className={styles.heading}>
          <span className={styles.eyebrow}>About the project</span>
          <h1>Explore the full image analysis application</h1>
          <p>
            Image Forensics Analysis brings saved image analyses into an interactive
            workspace. Explore the demo here, or get the full application and
            installation instructions on GitHub.
          </p>
        </header>
        <ul className={styles.steps} style={{ listStyleType: 'disc' }}>
          <li><strong>Inspect image elements:</strong> explore detected objects, image regions, and descriptions.</li>
          <li><strong>Compare results:</strong> browse rankings, clusters, and visual analysis views.</li>
          <li><strong>Review forensic outputs:</strong> examine saved forgery detection and synthetic image analysis results.</li>
          <li><strong>Analyze your own images:</strong> connect the local app to the separate analysis backend and save the results.</li>
        </ul>
        <div className={styles.actions}>
          <a className={styles.primary} href="https://github.com/In-dialog/image-forensics-frontend" target="_blank" rel="noopener noreferrer">
            Get the full application on GitHub ↗
          </a>
        </div>
      </article>
    </WorkspaceShell>
  );
}
