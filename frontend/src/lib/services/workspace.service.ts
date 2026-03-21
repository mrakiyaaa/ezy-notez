import type { Activity } from "@/types/activity";
import type { Invite } from "@/types/invite";
import type { CreateWorkspaceInput, Workspace } from "@/types/workspace";
import activitiesData from "@/lib/mock/activities.json";
import invitesData from "@/lib/mock/invites.json";
import workspacesData from "@/lib/mock/workspaces.json";

const asWorkspace = (item: Workspace): Workspace => item;
const asInvite = (item: Invite): Invite => item;

const mapWorkspaces = (): Workspace[] => workspacesData.map(asWorkspace);
const mapInvites = (): Invite[] => invitesData.map(asInvite);
const mapActivities = (): Activity[] => activitiesData as Activity[];

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const createWorkspace = async (
  input: CreateWorkspaceInput,
): Promise<Workspace> => {
  const created: Workspace = {
    id: `ws-${Date.now()}`,
    name: input.name.trim(),
    slug: toSlug(input.name),
    description: input.description?.trim() || "",
    createdAt: new Date().toISOString(),
    aura: input.aura,
    aura_keyword: input.auraKeyword,
  };

  return created;
};

const getDailyBriefing = async (): Promise<string[]> => {
  const activities = mapActivities();
  return activities.slice(0, 3).map((activity) => {
    const due = new Date(activity.dueAt).toLocaleDateString();
    return `${activity.title} in ${activity.category} is due on ${due}.`;
  });
};

export const workspaceService = {
  getWorkspaces: async (): Promise<Workspace[]> => mapWorkspaces(),
  getInvites: async (): Promise<Invite[]> => mapInvites(),
  getActivities: async (): Promise<Activity[]> => mapActivities(),
  createWorkspace,
  getDailyBriefing,
};
