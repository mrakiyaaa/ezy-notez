import type { Request, Response } from "express";
import { getHubAnalytics } from "../services/analytics.service";

/**
 * GET /api/analytics/hub
 * Returns cross-feature activities + daily briefing for the workspace hub
 * sidebar: pending study-room work, unattempted quizzes, etc.
 */
export const getHubAnalyticsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const data = await getHubAnalytics(userId, userEmail);

    res.status(200).json({
      status: "success",
      message: "Hub analytics fetched successfully",
      data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch hub analytics";
    console.error("[getHubAnalyticsHandler]", error);
    res.status(500).json({ status: "error", message });
  }
};
