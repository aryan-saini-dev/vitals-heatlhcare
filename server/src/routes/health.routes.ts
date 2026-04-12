import { Router } from "express";

// ─── Health & Debug Routes ───────────────────────────────────────────────────

const router = Router();

router.get("/health", (_req, res) => res.json({ ok: true }));

router.get("/api/ping", (_req, res) => res.json({ ok: true, service: "vitals-api" }));

router.get("/api/debug/vapi-config", (_req, res) => {
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID || "";
  const assistantId = process.env.VAPI_ASSISTANT_ID || "";
  return res.json({
    hasVapiApiKey: Boolean(process.env.VAPI_API_KEY),
    assistantId,
    phoneNumberId,
  });
});

export default router;
