import Link from "next/link";
import { WorkspaceShell } from "./WorkspaceShell";
import { NavigationIcon } from '@/shared/components/navigation/NavigationIcon';
import { workspaceNavigation } from '../config/navigation';
import styles from "../workspace.module.css";

export function HomeScreen() {
  return (
    <WorkspaceShell active="home" frameless centered wide>
      <nav className={styles.home} aria-label="Start page">
        <div className={styles.choices}>
          {workspaceNavigation.filter(item => item.id !== 'home').map(item => <Link key={item.id} className={styles.choice} href={item.href}>
            <NavigationIcon name={item.icon} size={64} className={styles.choiceIcon} />
            <span className={styles.choiceLabel}>{item.label}</span>
          </Link>)}
        </div>
      </nav>
    </WorkspaceShell>
  );
}
