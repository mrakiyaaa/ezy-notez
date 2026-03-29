export type SummaryFormat = "bullet" | "short" | "detailed";
export type SummaryStatus = "pending" | "processing" | "ready" | "failed";

export interface Summary {
  id: string;
  workspace_id: string;
  resource_id: string | null;
  user_id: string;
  format: SummaryFormat;
  content: string;
  source_ids: string[];
  status: SummaryStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
