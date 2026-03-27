import type { Workspace } from "@/types/workspace";
import CreateWorkspaceCard from "@/components/dashboard/CreateWorkspaceCard";
import WorkspaceCard from "@/components/dashboard/WorkspaceCard";

interface WorkspaceGridProps {
  workspaces: Workspace[];
  onOpenCreate: () => void;
  onSelectWorkspace: (slug: string) => void;
  onDeleteWorkspace: (id: string) => void;
}

export default function WorkspaceGrid({
  workspaces,
  onOpenCreate,
  onSelectWorkspace,
  onDeleteWorkspace,
}: WorkspaceGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      <CreateWorkspaceCard onOpen={onOpenCreate} />
      {workspaces.map((workspace) => (
        <WorkspaceCard
          key={workspace.id}
          workspace={workspace}
          onOpen={onSelectWorkspace}
          onDelete={onDeleteWorkspace}
        />
      ))}
    </div>
  );
}