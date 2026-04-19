import type { Request, Response } from "express";
import axios from "axios";
import { supabaseAdmin } from "../config/supabase";

// Use 127.0.0.1 explicitly — on Windows, "localhost" resolves to ::1 (IPv6)
// which is refused when the service listens only on 127.0.0.1 (IPv4).
const PYTHON_ML_URL =
  process.env.PYTHON_ML_URL || "http://127.0.0.1:8000";
const CHATIE_ML_BASE_URL = `${PYTHON_ML_URL.replace(/\/+$/, "")}/chatie`;

const isServiceUnavailable = (err: unknown): boolean => {
  if (err instanceof Error) {
    const msg = err.message;
    return (
      msg.includes("ECONNREFUSED") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("ECONNRESET") ||
      msg.includes("ETIMEDOUT")
    );
  }
  return false;
};

const ML_TIMEOUT_MS = 120_000;

// ---------------------------------------------------------------------------
// POST /api/chatie/embed
// ---------------------------------------------------------------------------

export const embedResourceHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { resource_id, workspace_id, text } = req.body as {
      resource_id?: string;
      workspace_id?: string;
      text?: string;
    };

    if (!resource_id || !workspace_id || !text) {
      res.status(400).json({
        status: "error",
        message: "resource_id, workspace_id, and text are required",
      });
      return;
    }

    const response = await axios.post(
      `${CHATIE_ML_BASE_URL}/embed-resource`,
      { resource_id, workspace_id, text },
      { timeout: ML_TIMEOUT_MS }
    );

    res.status(200).json({ status: "success", data: response.data });
  } catch (error) {
    console.error("[embedResourceHandler]", error);
    if (isServiceUnavailable(error)) {
      res.status(503).json({ status: "error", message: "Chatie ML service is offline" });
      return;
    }
    const message =
      error instanceof Error ? error.message : "Failed to embed resource";
    res.status(500).json({ status: "error", message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/chatie/sessions/:workspaceId
// ---------------------------------------------------------------------------

export const getSessionsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { workspaceId } = req.params;

    const { data, error } = await supabaseAdmin
      .from("chat_sessions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    res.status(200).json({ status: "success", data: { sessions: data ?? [] } });
  } catch (error) {
    console.error("[getSessionsHandler]", error);
    res.status(500).json({ status: "error", message: "Failed to fetch sessions" });
  }
};

// ---------------------------------------------------------------------------
// POST /api/chatie/sessions
// ---------------------------------------------------------------------------

export const createSessionHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { workspace_id, title } = req.body as {
      workspace_id?: string;
      title?: string;
    };

    if (!workspace_id) {
      res.status(400).json({ status: "error", message: "workspace_id is required" });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("chat_sessions")
      .insert({
        workspace_id,
        user_id: userId,
        title: title ?? "New Chat",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.status(201).json({ status: "success", data: { session: data } });
  } catch (error) {
    console.error("[createSessionHandler]", error);
    res.status(500).json({ status: "error", message: "Failed to create session" });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/chatie/sessions/:sessionId
// ---------------------------------------------------------------------------

export const updateSessionHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { sessionId } = req.params;
    const { title } = req.body as { title?: string };

    if (!title) {
      res.status(400).json({ status: "error", message: "title is required" });
      return;
    }

    const { error } = await supabaseAdmin
      .from("chat_sessions")
      .update({ title })
      .eq("id", sessionId)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("[updateSessionHandler]", error);
    res.status(500).json({ status: "error", message: "Failed to update session" });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/chatie/sessions/:sessionId
// ---------------------------------------------------------------------------

export const deleteSessionHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { sessionId } = req.params;

    const { error } = await supabaseAdmin
      .from("chat_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    res.status(200).json({ status: "success", message: "Session deleted" });
  } catch (error) {
    console.error("[deleteSessionHandler]", error);
    res.status(500).json({ status: "error", message: "Failed to delete session" });
  }
};

// ---------------------------------------------------------------------------
// POST /api/chatie/message
// ---------------------------------------------------------------------------

export const sendMessageHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { workspace_id, session_id, message, resource_ids } = req.body as {
      workspace_id?: string;
      session_id?: string;
      message?: string;
      resource_ids?: string[];
    };

    if (!workspace_id || !session_id || !message) {
      res.status(400).json({
        status: "error",
        message: "workspace_id, session_id, and message are required",
      });
      return;
    }

    const response = await axios.post(
      `${CHATIE_ML_BASE_URL}/chat`,
      {
        workspace_id,
        user_id: userId,
        session_id,
        message,
        resource_ids: resource_ids ?? [],
      },
      { timeout: ML_TIMEOUT_MS }
    );

    res.status(200).json({ status: "success", data: response.data });
  } catch (error) {
    console.error("[sendMessageHandler]", error);
    if (isServiceUnavailable(error)) {
      res.status(503).json({ status: "error", message: "ML service is offline. Run `npm run setup:ml` then `npm run dev:ml` to start it." });
      return;
    }
    const message =
      error instanceof Error ? error.message : "Failed to send message";
    res.status(500).json({ status: "error", message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/chatie/history/:workspaceId/:sessionId
// ---------------------------------------------------------------------------

export const getChatHistoryHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { workspaceId, sessionId } = req.params;
    if (!workspaceId || !sessionId) {
      res.status(400).json({ status: "error", message: "workspaceId and sessionId are required" });
      return;
    }

    const response = await axios.get(
      `${CHATIE_ML_BASE_URL}/chat-history/${workspaceId}/${userId}/${sessionId}`,
      { timeout: 30_000 }
    );

    res.status(200).json({ status: "success", data: response.data });
  } catch (error) {
    console.error("[getChatHistoryHandler]", error);
    if (isServiceUnavailable(error)) {
      res.status(200).json({ status: "success", data: { history: [] } });
      return;
    }
    const message =
      error instanceof Error ? error.message : "Failed to fetch chat history";
    res.status(500).json({ status: "error", message });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/chatie/history/:workspaceId/:sessionId
// ---------------------------------------------------------------------------

export const deleteChatHistoryHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { workspaceId, sessionId } = req.params;
    if (!workspaceId || !sessionId) {
      res.status(400).json({ status: "error", message: "workspaceId and sessionId are required" });
      return;
    }

    await axios.delete(
      `${CHATIE_ML_BASE_URL}/chat-history/${workspaceId}/${userId}/${sessionId}`,
      { timeout: 30_000 }
    );

    res.status(200).json({ status: "success", message: "Chat history cleared" });
  } catch (error) {
    console.error("[deleteChatHistoryHandler]", error);
    if (isServiceUnavailable(error)) {
      res.status(503).json({ status: "error", message: "Chatie ML service is offline" });
      return;
    }
    const message =
      error instanceof Error ? error.message : "Failed to clear chat history";
    res.status(500).json({ status: "error", message });
  }
};
