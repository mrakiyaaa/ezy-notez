import { Router } from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import {
  embedResourceHandler,
  getSessionsHandler,
  createSessionHandler,
  updateSessionHandler,
  deleteSessionHandler,
  sendMessageHandler,
  getChatHistoryHandler,
  deleteChatHistoryHandler,
} from "../controllers/chatie.controller";

const router = Router();

router.use(authenticateUser);

router.post("/embed", embedResourceHandler);

// Sessions
router.get("/sessions/:workspaceId", getSessionsHandler);
router.post("/sessions", createSessionHandler);
router.patch("/sessions/:sessionId", updateSessionHandler);
router.delete("/sessions/:sessionId", deleteSessionHandler);

// Messages + history (scoped to session)
router.post("/message", sendMessageHandler);
router.get("/history/:workspaceId/:sessionId", getChatHistoryHandler);
router.delete("/history/:workspaceId/:sessionId", deleteChatHistoryHandler);

export default router;
