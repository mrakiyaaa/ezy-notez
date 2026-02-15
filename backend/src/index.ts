import cors from "cors";
import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(cors({ origin: frontendUrl, credentials: true }));
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/db/health", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT 1 AS ok");
    res.json({ status: "ok", db: result.rows[0] });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: (error as Error).message });
  }
});

app.post("/api/auth/magic-link", async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || "").trim();
    const redirectTo = String(req.body?.redirectTo || frontendUrl).trim();

    if (!email) {
      return res
        .status(400)
        .json({ status: "error", message: "Email is required." });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return res
        .status(500)
        .json({ status: "error", message: "Supabase env vars are missing." });
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    if (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }

    return res.json({ status: "ok" });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: (error as Error).message });
  }
});

app.post("/api/auth/verify-otp", async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || "").trim();
    const token = String(req.body?.token || "").trim();

    if (!email || !token) {
      return res
        .status(400)
        .json({ status: "error", message: "Email and token are required." });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return res
        .status(500)
        .json({ status: "error", message: "Supabase env vars are missing." });
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }

    return res.json({ status: "ok", user: data.user, session: data.session });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: (error as Error).message });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
