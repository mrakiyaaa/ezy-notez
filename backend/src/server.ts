import "./config/env";

import cors from "cors";
import cookieParser from "cookie-parser";
import express, { Request, Response } from "express";
import { Pool } from "pg";
import authRoutes from "./routes/auth.routes";
import workspaceRoutes from "./routes/workspace.routes";

const app = express();
const port = Number(process.env.PORT) || 3001;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(cors({ origin: frontendUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/db/health", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT 1 AS ok");
    res.json({ status: "ok", db: result.rows[0] });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: (error as Error).message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});

export default app;
