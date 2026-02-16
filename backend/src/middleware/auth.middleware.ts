import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const headerToken = req.headers.authorization?.split(" ")[1];
    const cookieToken = req.cookies?.["sb-access-token"];
    const token = headerToken || cookieToken;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.user = data.user;

    next();
  } catch (err) {
    return res.status(500).json({ message: "Authentication failed" });
  }
};
