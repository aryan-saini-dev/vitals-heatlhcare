import { Router } from "express";
import { authenticateRequest } from "../middlewares/auth.middleware.js";

// ─── Alerts Routes ───────────────────────────────────────────────────────────

const router = Router();

/** Alerts list with patient/agent names and latest matching call per patient. */
router.get("/api/alerts", async (req, res) => {
  try {
    const authHeader = String(req.headers.authorization || "");
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!accessToken) return res.status(401).json({ error: "Missing Authorization Bearer token" });
    const authCtx = await authenticateRequest(accessToken);
    if (!authCtx) return res.status(401).json({ error: "Invalid token" });
    const { userId, supabase } = authCtx;

    const [{ data: alertRows, error: alertsErr }, { data: callRows }] = await Promise.all([
      supabase.from("alerts").select("*").eq("docuuid", userId).order("created_at", { ascending: false }),
      supabase.from("calls").select("*").eq("docuuid", userId).order("created_at", { ascending: false }),
    ]);

    if (alertsErr) {
      console.error("[AlertsList] query error:", alertsErr);
      return res.status(500).json({ error: alertsErr.message });
    }

    const calls = callRows || [];
    const callsByPatient = new Map<string, any[]>();
    for (const c of calls) {
      const pid = c.patient_id;
      if (!pid) continue;
      if (!callsByPatient.has(pid)) callsByPatient.set(pid, []);
      callsByPatient.get(pid)!.push(c);
    }
    for (const [, arr] of callsByPatient) {
      arr.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    }

    const alerts = alertRows || [];
    const patientIds = [...new Set(alerts.map((a: any) => a.patient_id).filter(Boolean))];
    const agentIds = [...new Set(alerts.map((a: any) => a.agent_id).filter(Boolean))];

    const [patsRes, agsRes] = await Promise.all([
      patientIds.length
        ? supabase.from("patients").select("id,name").eq("docuuid", userId).in("id", patientIds)
        : Promise.resolve({ data: [] as any[] }),
      agentIds.length
        ? supabase.from("agents").select("id,name").eq("docuuid", userId).in("id", agentIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const pMap = Object.fromEntries((patsRes.data || []).map((p: any) => [p.id, p.name]));
    const aMap = Object.fromEntries((agsRes.data || []).map((a: any) => [a.id, a.name]));

    const pickCallForAlert = (patientId: string, alertCreated: string | null) => {
      const list = callsByPatient.get(patientId);
      if (!list?.length) return null;
      const alertMs = alertCreated ? new Date(alertCreated).getTime() : 0;
      if (alertMs) {
        const windowMs = 5 * 60 * 1000;
        const near = list.find((c) => {
          const t = c.created_at ? new Date(c.created_at).getTime() : 0;
          return t && Math.abs(t - alertMs) <= windowMs;
        });
        if (near) return near;
      }
      return list[0];
    };

    const merged = alerts.map((a: any) => ({
      ...a,
      patient_name: pMap[a.patient_id] || "Unknown",
      agent_name: a.agent_id ? aMap[a.agent_id] || "Unknown" : "Unknown",
      call: pickCallForAlert(a.patient_id, a.created_at),
    }));

    return res.json({ alerts: merged });
  } catch (e: any) {
    console.error("[AlertsList] error:", e);
    return res.status(500).json({ error: e?.message || "Failed to load alerts" });
  }
});

export default router;
