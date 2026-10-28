import { SetupGuide } from '@/features/setup/components/SetupGuide';
import { WorkspaceShell } from '@/features/workspace/components/WorkspaceShell';

export default function HostedSetupPage() {
  return <WorkspaceShell active="analysis" wide><SetupGuide hosted /></WorkspaceShell>;
}
