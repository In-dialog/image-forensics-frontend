import styles from './runOutput.module.css';

function latestLine(lines: string[]) {
  for (let index = lines.length - 1; index >= 0; index--) {
    const line = lines[index].split(/\r\n?|\n/).findLast(value => value.trim().length > 0);
    if (line) return line;
  }
  return 'Waiting for the first stage\u2026';
}

export function RunLog({ lines }: { lines: string[] }) {
  const message = latestLine(lines);
  return <section className={styles.runLog} aria-labelledby="run-log-heading">
    <h2 id="run-log-heading">Run log</h2>
    <p className={styles.latestLine} role="log" aria-label="Latest analysis log line" aria-live="polite" aria-atomic="true" tabIndex={0} title={message}>{message}</p>
  </section>;
}
