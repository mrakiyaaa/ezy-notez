import type { Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { updateProfileFullName } from "../services/profile.service";
import { generateNameFromEmail } from "../utils/nameGenerator";

type ProfileRecord = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
};

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  } as const;
};

const setSessionCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const options = getCookieOptions();
  res.cookie("sb-access-token", accessToken, options);
  res.cookie("sb-refresh-token", refreshToken, options);
};

export const requestOtp = async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || "").trim();
    const redirectTo = String(req.body?.redirectTo || "").trim();

    if (!email) {
      return res
        .status(400)
        .json({ status: "error", message: "Email is required." });
    }

    const { error } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
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
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || "").trim();
    const token = String(req.body?.token || "").trim();

    if (!email || !token) {
      return res
        .status(400)
        .json({ status: "error", message: "Email and token are required." });
    }

    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error || !data.session || !data.user) {
      return res
        .status(400)
        .json({ status: "error", message: error?.message || "Invalid OTP." });
    }

    setSessionCookies(res, data.session.access_token, data.session.refresh_token);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, avatar_url, created_at")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      return res
        .status(500)
        .json({ status: "error", message: profileError.message });
    }

    let profileRecord = profile as ProfileRecord | null;

    if (!profileRecord) {
      const fullName = generateNameFromEmail(data.user.email || email);
      const createdAt = new Date().toISOString();

      const { data: insertProfile, error: insertError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: data.user.id,
          email: data.user.email || email,
          full_name: fullName,
          avatar_url: null,
          created_at: createdAt,
        })
        .select("id, email, full_name, avatar_url, created_at")
        .single();

      if (insertError) {
        return res
          .status(500)
          .json({ status: "error", message: insertError.message });
      }

      profileRecord = insertProfile as ProfileRecord;
    }

    return res.json({
      status: "ok",
      user: data.user,
      profile: profileRecord,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: (error as Error).message });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: "error", message: "Unauthorized" });
    }

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, avatar_url, created_at")
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ status: "error", message: error.message });
    }

    return res.json({ status: "ok", user: req.user, profile });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: (error as Error).message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: "error", message: "Unauthorized" });
    }

    const fullName = String(req.body?.full_name || "").trim();

    if (!fullName) {
      return res
        .status(400)
        .json({ status: "error", message: "Full name is required." });
    }

    const profile = await updateProfileFullName(req.user.id, fullName);

    return res.json({ status: "ok", profile });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: (error as Error).message });
  }
};
