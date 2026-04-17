import { Router } from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { getHubAnalyticsHandler } from "../controllers/analytics.controller";

const router = Router();

router.use(authenticateUser);

// Workspace hub: cross-feature activities + daily briefing
router.get("/hub", getHubAnalyticsHandler);

export default router;
