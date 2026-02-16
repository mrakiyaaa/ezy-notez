export type ActivityStatus = "pending" | "in-progress" | "done";

export interface Activity {
  id: string;
  title: string;
  category: string;
  status: ActivityStatus;
  progress: number;
  dueAt: string;
}
