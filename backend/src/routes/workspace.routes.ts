import { Router, Request, Response } from "express";
import { authenticateUser } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authenticateUser, async (req: Request, res: Response) => {
  const userId = req.user?.id;

  return res.json({
    message: "Workspaces fetched successfully",
    userId,
  });
});

export default router;
