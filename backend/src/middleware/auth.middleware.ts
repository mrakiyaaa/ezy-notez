import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";

// Session absolute lifetime: 1 hour
const ONE_HOUR_MS = 60 * 60 * 1000;

const getRefreshedCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: ONE_HOUR_MS, // Expire after 1 hour (absolute session limit)
  };
};

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Try access token (header or cookie)
    const headerToken = req.headers.authorization?.split(" ")[1];
    const cookieToken = req.cookies?.["sb-access-token"];
    const token = headerToken || cookieToken;

    if (token) {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data.user) {
        req.user = data.user;
        return next();
      }
    }

    // 2. Access token missing/expired — try refresh token
    const refreshToken = req.cookies?.["sb-refresh-token"];
    if (refreshToken) {
      const { data: refreshData, error: refreshError } =
        await supabaseAdmin.auth.refreshSession({ refresh_token: refreshToken });

      if (!refreshError && refreshData.session && refreshData.user) {
        // Rotate cookies with the new tokens
        const opts = getRefreshedCookieOptions();
        res.cookie("sb-access-token", refreshData.session.access_token, opts);
        res.cookie("sb-refresh-token", refreshData.session.refresh_token, opts);
        req.user = refreshData.user;
        return next();
      }
    }

    return res.status(401).json({ message: "Unauthorized" });
  } catch (err) {
    return res.status(500).json({ message: "Authentication failed" });
  }
};
