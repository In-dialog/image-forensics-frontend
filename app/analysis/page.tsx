import { AnalysisWorkspace } from "@/features/analysis/components/AnalysisWorkspace";
import { WorkspaceShell } from "@/features/workspace/components/WorkspaceShell";

export default function AnalysisPage() {
  return <WorkspaceShell active="analysis" wide fill><AnalysisWorkspace /></WorkspaceShell>;
}
