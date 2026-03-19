export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  aura: string;
  aura_keyword: string;
  createdAt: string;
  user_id?: string;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  aura: string;
  auraKeyword: string;
}
