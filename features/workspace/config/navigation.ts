import type { NavigationIconName } from '@/shared/components/navigation/NavigationIcon';

export type WorkspaceSection = 'home' | 'results' | 'analysis' | 'about';

export const workspaceNavigation: readonly {
  id: WorkspaceSection; href: string; label: string; icon: NavigationIconName;
}[] = [
  { id: 'home', href: '/', label: 'Home', icon: 'home' },
  { id: 'results', href: '/results', label: 'View database', icon: 'database' },
  { id: 'analysis', href: '/analysis', label: 'New analysis', icon: 'analysis' },
  { id: 'about', href: '/about', label: 'About', icon: 'about' },
];
