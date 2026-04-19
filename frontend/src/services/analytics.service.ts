import { apiClient } from "@/api/axios-config";
import type { Activity } from "@/types/activity";

export interface HubAnalytics {
  activities: Activity[];
  briefing: string[];
}

/**
 * Fetch cross-feature activities and daily briefing for the workspace hub
 * sidebar. Aggregates active study rooms, unattempted quizzes, and recent
 * workspace activity on the backend.
 */
export async function getHubAnalytics(): Promise<HubAnalytics> {
  try {
    const response = await apiClient.get("/analytics/hub");
    return response.data.data as HubAnalytics;
  } catch (error) {
    console.error("[analytics] Failed to fetch hub analytics:", error);
    return { activities: [], briefing: [] };
  }
}
