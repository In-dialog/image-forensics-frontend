import Link from "next/link";
import { WorkspaceShell } from "@/features/workspace/components/WorkspaceShell";

export default function ResultNotFound() {
  return (
    <WorkspaceShell active="results">
      <h1>Result not available</h1>
      <p>This result may still be processing, or its files may have moved.</p>
      <Link href="/results">Back to results</Link>
    </WorkspaceShell>
  );
}
