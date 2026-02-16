export interface Workspace {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  sourcesCount: number;
  aura: string;
}

export interface CreateWorkspaceInput {
  name: string;
  description: string;
  aura: string;
}
