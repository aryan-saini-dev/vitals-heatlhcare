import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseUrl, requireEnv } from "../config/env.js";

// ─── Auth Middleware ─────────────────────────────────────────────────────────

export async function authenticateRequest(accessToken: string) {
  const supabase = createClient(requireSupabaseUrl(), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: authData, error: authErr } = await supabase.auth.getUser(accessToken);
  if (authErr || !authData?.user) return null;
  return {
    userId: authData.user.id,
    supabase,
    userEmail: String(authData.user.email || ""),
  };
}

/**
 * Express middleware that extracts the Bearer token, validates it,
 * and attaches `req.authCtx` (userId, supabase, userEmail) to the request.
 * If authentication fails, it sends 401 and short-circuits.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = String(req.headers.authorization || "");
  const accessToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!accessToken) {
    res.status(401).json({ error: "Missing Authorization Bearer token" });
    return;
  }

  authenticateRequest(accessToken)
    .then((authCtx) => {
      if (!authCtx) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }
      (req as any).authCtx = authCtx;
      next();
    })
    .catch((err) => {
      console.error("[Auth] middleware error:", err);
      res.status(500).json({ error: "Authentication failed" });
    });
}
