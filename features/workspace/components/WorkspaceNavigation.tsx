import Link from 'next/link';
import { NavigationIcon } from '@/shared/components/navigation/NavigationIcon';
import { workspaceNavigation, type WorkspaceSection } from '../config/navigation';
import styles from '@/shared/components/navigation/navigation.module.css';

export function WorkspaceNavigation({ active }: { active: WorkspaceSection }) {
  return <nav className={styles.links} aria-label="Workspace">
    {workspaceNavigation.map(item => <Link key={item.id} className={styles.item} href={item.href}
      aria-current={item.id === active ? 'page' : undefined}>
      <NavigationIcon name={item.icon} /><span>{item.label}</span>
    </Link>)}
  </nav>;
}
