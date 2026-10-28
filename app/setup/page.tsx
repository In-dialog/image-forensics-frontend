import { SetupGuide } from '@/features/setup/components/SetupGuide';
import { WorkspaceShell } from '@/features/workspace/components/WorkspaceShell';

export default function SetupPage() {
  return <WorkspaceShell active="analysis" wide><SetupGuide /></WorkspaceShell>;
}
