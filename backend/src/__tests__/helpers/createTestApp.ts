/**
 * Builds a test-scoped Express app that mirrors server.ts routing
 * without calling app.listen() or creating a pg.Pool.
 *
 * All route modules, controllers, and services are loaded normally.
 * Tests mock external dependencies (Supabase, axios, child_process)
 * via jest.mock() before importing this helper.
 */
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";

import authRoutes from "../../routes/auth.routes";
import flashcardRoutes from "../../routes/flashcard.routes";
import quizRoutes from "../../routes/quiz.routes";
import resourceRoutes from "../../routes/resource.routes";
import summaryRoutes from "../../routes/summary.routes";
import workspaceRoutes from "../../routes/workspace.routes";

export function createTestApp() {
  const app = express();

  app.use(cors({ origin: "http://localhost:3000", credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/workspaces", workspaceRoutes);
  app.use("/api/resources", resourceRoutes);
  app.use("/api/summaries", summaryRoutes);
  app.use("/api/flashcards", flashcardRoutes);
  app.use("/api/quiz", quizRoutes);

  return app;
}
