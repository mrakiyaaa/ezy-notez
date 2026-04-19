"use client";

import { motion } from "framer-motion";
import type { Workspace } from "@/types/workspace";
import CreateWorkspaceCard from "@/components/dashboard/CreateWorkspaceCard";
import WorkspaceCard from "@/components/dashboard/WorkspaceCard";
import { staggerContainer, staggerItem } from "@/lib/animations";

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
    <motion.div
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={staggerItem} className="h-full">
        <CreateWorkspaceCard onOpen={onOpenCreate} />
      </motion.div>
      {workspaces.map((workspace) => (
        <motion.div key={workspace.id} variants={staggerItem} className="h-full">
          <WorkspaceCard
            workspace={workspace}
            onOpen={onSelectWorkspace}
            onDelete={onDeleteWorkspace}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
