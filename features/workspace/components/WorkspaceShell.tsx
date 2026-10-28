import Link from "next/link";
import type { ReactNode } from "react";
import { WorkspaceNavigation } from './WorkspaceNavigation';
import type { WorkspaceSection } from '../config/navigation';
import { APP_NAME } from '@/shared/config/application';
import styles from "../workspace.module.css";

type WorkspaceShellProps = {
  children: ReactNode;
  active?: WorkspaceSection;
  wide?: boolean;
  frameless?: boolean;
  fill?: boolean;
  centered?: boolean;
};

export function WorkspaceShell({ children, active = 'home', wide = false, frameless = false, fill = false, centered = false }: WorkspaceShellProps) {
  return (
    <div className={`${styles.workspace} ${fill ? styles.workspaceFill : ''} ${centered ? styles.workspaceCentered : ''}`}>
      <a className={styles.skipLink} href="#workspace-content">Skip to content</a>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-current={active === "home" ? "page" : undefined}>
          {APP_NAME}
        </Link>
        <WorkspaceNavigation active={active} />
      </header>
      <main id="workspace-content" className={`${styles.main} ${wide ? styles.wide : ""} ${frameless ? styles.frameless : ""} ${fill ? styles.fill : ''} ${centered ? styles.centered : ''}`}>
        {children}
      </main>
    </div>
  );
}
