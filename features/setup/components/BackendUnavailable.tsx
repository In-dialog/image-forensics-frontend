import Link from 'next/link';
import styles from '../setup.module.css';

export function BackendUnavailable() {
  return <section className={styles.unavailable} aria-labelledby="backend-setup-title">
    <h2 id="backend-setup-title">Connect the analysis backend</h2>
    <p>Start the backend on this computer, then try again. If this is your first time, the setup guide covers installation, supported hardware, Ollama, and Hugging Face access.</p>
    <Link href="/setup">Open setup guide →</Link>
  </section>;
}
