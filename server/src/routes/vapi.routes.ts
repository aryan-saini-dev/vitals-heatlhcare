import { Router } from "express";
import crypto from "crypto";
import { VapiClient } from "@vapi-ai/server-sdk";
import { createClient } from "@supabase/supabase-js";
import { requireEnv, requireSupabaseUrl } from "../config/env.js";
import { authenticateRequest } from "../middlewares/auth.middleware.js";
import { normalizeE164, parseVapiError, effectiveCallTranscript } from "../utils/helpers.js";
import {
  detectAssistantMisconfig,
  extractVapiPersistContext,
  unwrapVapiCallResponse,
  buildTranscriptFromVapiCall,
  extractVapiDurationSeconds,
} from "../services/vapi.service.js";
import { generateDoctorSummaryServer } from "../services/llm.service.js";
import { persistCallAndAlertAfterAnalysis } from "../services/call-persist.service.js";

// ─── Vapi Routes ─────────────────────────────────────────────────────────────

const router = Router();

router.get("/api/vapi/call/:callId", async (req, res) => {
  try {
    const { callId } = req.params;
    const vapiApiKey = requireEnv("VAPI_API_KEY");
    const resp = await fetch(`https://api.vapi.ai/call/${callId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${vapiApiKey}`,
      },
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("[CallStatus] provider error:", body);
      return res.status(resp.status).json({
        error: body?.message || "Failed to fetch call status",
        provider: body,
      });
    }

    const call = unwrapVapiCallResponse(body) || {};
    const transcript = buildTranscriptFromVapiCall(call);
    const durationSeconds = extractVapiDurationSeconds(call);
    return res.json({
      id: call.id,
      status: call.status,
      endedReason: call.endedReason || null,
      transcript,
      durationSeconds,
      messages: Array.isArray(call.messages) ? call.messages : [],
      customer: call.customer || null,
      startedAt: call.startedAt || null,
      endedAt: call.endedAt || null,
      phoneCallProvider: call.phoneCallProvider || null,
    });
  } catch (e: any) {
    console.error("[CallStatus] fatal error:", e);
    return res.status(500).json({ error: e?.message || "Call status failed" });
  }
});

/**
 * GET /api/vapi/call/:callId/transcript
 * Fetches a single call from Vapi and returns only the transcript text.
 */
router.get("/api/vapi/call/:callId/transcript", async (req, res) => {
  try {
    const { callId } = req.params;
    if (!callId) {
      return res.status(400).json({ error: "callId is required" });
    }

    // Vapi requires a valid UUID — reject placeholder IDs early
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(callId)) {
      console.warn("[TranscriptFetch] non-UUID callId skipped:", callId);
      return res.status(400).json({
        error: "callId must be a valid UUID (Vapi call IDs are UUIDs).",
        callId,
      });
    }
    const vapiApiKey = requireEnv("VAPI_API_KEY");
    const resp = await fetch(`https://api.vapi.ai/call/${callId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${vapiApiKey}`,
      },
    });

    const body = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      console.error("[TranscriptFetch] Vapi error:", body);
      return res.status(resp.status).json({
        error: body?.message || "Failed to fetch call from Vapi",
        provider: body,
      });
    }

    const call = unwrapVapiCallResponse(body) || {};
    const transcript = buildTranscriptFromVapiCall(call);

    console.log(
      "[TranscriptFetch] callId:", callId,
      "| transcript chars:", transcript.length,
    );

    return res.json({
      callId,
      transcript: transcript || "No transcript found.",
      hasTranscript: transcript.length > 0,
    });
  } catch (e: any) {
    console.error("[TranscriptFetch] error:", e);
    return res.status(500).json({ error: e?.message || "Transcript fetch failed" });
  }
});

router.post("/api/vapi/outbound-call", async (req, res) => {
  try {
    const authHeader = String(req.headers.authorization || "");
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!accessToken) {
      return res.status(401).json({ error: "Missing Authorization Bearer token" });
    }

    const authCtx = await authenticateRequest(accessToken);
    if (!authCtx) return res.status(401).json({ error: "Invalid token" });
    const { userId, supabase, userEmail } = authCtx;

    const { patientId, destinationNumber, callerNumber } = req.body || {};
    if (!patientId || !destinationNumber) {
      return res.status(400).json({ error: "patientId and destinationNumber are required" });
    }
    const destinationE164 = normalizeE164(destinationNumber);

    const patientRes = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .eq("docuuid", userId)
      .single();
    if (patientRes.error || !patientRes.data) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const patient = patientRes.data as any;
    const assistantId = requireEnv("VAPI_ASSISTANT_ID");
    const phoneNumberId = requireEnv("VAPI_PHONE_NUMBER_ID");
    const assistantMisconfig = await detectAssistantMisconfig(assistantId);
    if (assistantMisconfig) {
      return res.status(400).json({ error: assistantMisconfig });
    }

    const vapi = new VapiClient({ token: requireEnv("VAPI_API_KEY") });
    const call = (await vapi.calls.create({
      assistantId,
      phoneNumberId,
      customer: { number: destinationE164 },
      assistantOverrides: {
        variableValues: {
          patientId: String(patient.id),
          patientName: patient.name || "",
          patientCondition: patient.condition || "",
          patientAge: patient.age ?? "",
          patientRiskLevel: patient.risk_level || "",
          callerNumber: callerNumber ? String(callerNumber) : destinationE164,
        },
      },
      metadata: {
        docuuid: userId,
        patient_id: String(patient.id),
        agent_id: patient.assigned_agent_id ? String(patient.assigned_agent_id) : null,
        doctor_email: userEmail || "",
      },
    } as any)) as any;

    console.log("[Outbound] created call:", call?.id);
    return res.json({ vapiCallId: call?.id });
  } catch (e: any) {
    const parsed = parseVapiError(e);
    console.error("[Outbound] error:", parsed.body || e);
    if (
      parsed.statusCode === 400 &&
      /international calls/i.test(String(parsed.message))
    ) {
      return res.status(400).json({
        error:
          "Your current Vapi phone number plan does not support international calls. Use a US (+1) destination or upgrade/buy an international-capable number in Vapi.",
        provider: parsed.body,
      });
    }
    return res.status(parsed.statusCode >= 400 ? parsed.statusCode : 500).json({
      error: parsed.message,
      provider: parsed.body || undefined,
    });
  }
});

router.post("/api/vapi/outbound-call/:callId/hangup", async (req, res) => {
  try {
    const { callId } = req.params;
    const vapiApiKey = requireEnv("VAPI_API_KEY");
    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${vapiApiKey}`,
        "Content-Type": "application/json",
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[Hangup] provider error:", body);
      return res.status(response.status).json({
        error: body?.message || "Hangup failed at provider",
        provider: body,
      });
    }
    console.log("[Hangup] call ended:", callId);
    return res.json({ ok: true, provider: body });
  } catch (e: any) {
    console.error("[Hangup] error:", e);
    return res.status(500).json({ error: e?.message || "Hangup failed" });
  }
});

/** When Vapi webhook cannot reach localhost, client can sync the finished call by provider id. */
router.post("/api/vapi/sync-call", async (req, res) => {
  try {
    const authHeader = String(req.headers.authorization || "");
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!accessToken) return res.status(401).json({ error: "Missing Authorization Bearer token" });
    const authCtx = await authenticateRequest(accessToken);
    if (!authCtx) return res.status(401).json({ error: "Invalid token" });
    const { userId, supabase, userEmail } = authCtx;
    const bodyIn = (req.body || {}) as {
      vapiCallId?: string;
      transcript?: string;
      durationSeconds?: number;
    };

    const vapiCallId = String(bodyIn.vapiCallId || "").trim();
    if (!vapiCallId) return res.status(400).json({ error: "vapiCallId is required" });

    const { data: existing } = await supabase
      .from("calls")
      .select("id")
      .eq("docuuid", userId)
      .contains("vitals_data", { VapiCallId: vapiCallId })
      .maybeSingle();

    if (existing?.id) {
      return res.json({ ok: true, duplicated: true, callId: existing.id });
    }

    const vapiApiKey = requireEnv("VAPI_API_KEY");
    const vapiResp = await fetch(`https://api.vapi.ai/call/${vapiCallId}`, {
      headers: { Authorization: `Bearer ${vapiApiKey}` },
    });
    const rawVapi = await vapiResp.json().catch(() => ({}));
    if (!vapiResp.ok) {
      console.error("[SyncCall] Vapi GET failed:", vapiResp.status, rawVapi);
      return res.status(vapiResp.status).json({
        error: rawVapi?.message || `Could not fetch call from Vapi (${vapiResp.status})`,
        provider: rawVapi,
      });
    }

    const vapiBody = unwrapVapiCallResponse(rawVapi);
    const ctx = extractVapiPersistContext(vapiBody);
    if (!ctx.patient_id) {
      return res.status(400).json({
        error:
          "Could not determine patient for this call. Vapi did not return patient metadata (patient_id / patientId / variableValues.patientId). Ensure outbound calls set metadata (this app sets it in /api/vapi/outbound-call).",
      });
    }
    if (ctx.metadataDocuuid && ctx.metadataDocuuid !== userId) {
      return res.status(403).json({ error: "Call metadata does not belong to this account" });
    }

    let transcript = buildTranscriptFromVapiCall(vapiBody);
    const clientTranscript = String(bodyIn.transcript || "").trim();
    if (!transcript.trim() && clientTranscript) transcript = clientTranscript;
    else if (clientTranscript.length > transcript.length + 20) transcript = clientTranscript;

    let duration_seconds = extractVapiDurationSeconds(vapiBody);
    const clientDur = Number(bodyIn.durationSeconds);
    if ((!duration_seconds || duration_seconds < 1) && Number.isFinite(clientDur) && clientDur > 0) {
      duration_seconds = Math.min(Math.round(clientDur), 24 * 3600);
    }

    const doctorEmail = (ctx.doctor_email?.trim() || userEmail || "").trim();

    const { data: patientRow } = await supabase
      .from("patients")
      .select("*")
      .eq("id", ctx.patient_id)
      .eq("docuuid", userId)
      .single();

    if (!patientRow) {
      return res.status(403).json({ error: "Patient not found for this account" });
    }

    const agentResolved =
      ctx.agent_id ||
      (patientRow.assigned_agent_id != null ? String(patientRow.assigned_agent_id) : null);

    const chartJson = JSON.stringify(
      patientRow
        ? {
            name: patientRow.name,
            condition: patientRow.condition,
            age: patientRow.age,
            risk_level: patientRow.risk_level,
            date_of_birth: patientRow.date_of_birth,
          }
        : {},
    );

    const summaryRaw = await generateDoctorSummaryServer(String(transcript || ""), chartJson);
    const result = await persistCallAndAlertAfterAnalysis({
      supabase,
      docuuid: userId,
      patient_id: String(ctx.patient_id),
      agent_id: agentResolved,
      duration_seconds,
      transcript: String(transcript || ""),
      summaryRaw,
      vapiCallId,
      patientRow,
      doctor_email: doctorEmail || null,
    });

    if (!result.ok) return res.status(500).json({ error: result.error });
    return res.json({ ok: true, callId: result.callId });
  } catch (e: any) {
    console.error("[SyncCall] error:", e);
    return res.status(500).json({ error: e?.message || "Sync failed" });
  }
});

router.post("/api/vapi/webhook", async (req, res) => {
  try {
    const secret = process.env.VAPI_WEBHOOK_SECRET;
    if (secret) {
      const signature = String(req.headers["x-vapi-signature"] || "");
      const rawBody: Buffer = (req as any).rawBody;
      const computed = crypto
        .createHmac("sha256", secret)
        .update(rawBody || Buffer.from(""))
        .digest("hex");
      if (signature && signature !== computed) {
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const payload: any = req.body;
    const metadata =
      payload?.metadata ||
      payload?.data?.metadata ||
      payload?.endOfCallReport?.metadata ||
      {};

    const docuuid = metadata?.docuuid;
    const patient_id = metadata?.patient_id;
    const agent_id = metadata?.agent_id;
    const transcript =
      payload?.transcript ||
      payload?.data?.transcript ||
      payload?.endOfCallReport?.transcript ||
      payload?.end_of_call_report?.transcript ||
      "";
    const durationRaw =
      payload?.durationSeconds ?? payload?.data?.durationSeconds ?? payload?.duration ?? 0;
    const duration_seconds = typeof durationRaw === "number" ? durationRaw : Number(durationRaw) || 0;

    if (!docuuid || !patient_id) return res.json({ received: true, skipped: true });

    const supabase = createClient(
      requireSupabaseUrl(),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    );

    const vapiCallId = String(
      payload?.id || payload?.callId || payload?.call?.id || payload?.data?.id || "",
    );
    if (vapiCallId) {
      const { data: dup } = await supabase
        .from("calls")
        .select("id")
        .eq("docuuid", docuuid)
        .contains("vitals_data", { VapiCallId: vapiCallId })
        .maybeSingle();
      if (dup?.id) {
        console.log("[Webhook] duplicate Vapi call skipped:", vapiCallId);
        return res.json({ received: true, duplicate: true });
      }
    }

    const { data: patientRow } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patient_id)
      .eq("docuuid", docuuid)
      .single();

    const chartJson = JSON.stringify(
      patientRow
        ? {
            name: patientRow.name,
            condition: patientRow.condition,
            age: patientRow.age,
            risk_level: patientRow.risk_level,
            date_of_birth: patientRow.date_of_birth,
          }
        : {},
    );

    const doctor_email =
      metadata?.doctor_email != null && String(metadata.doctor_email).trim() !== ""
        ? String(metadata.doctor_email).trim()
        : metadata?.doctorEmail != null && String(metadata.doctorEmail).trim() !== ""
          ? String(metadata.doctorEmail).trim()
          : null;

    const summaryRaw = await generateDoctorSummaryServer(String(transcript || ""), chartJson);
    await persistCallAndAlertAfterAnalysis({
      supabase,
      docuuid,
      patient_id: String(patient_id),
      agent_id: agent_id ? String(agent_id) : null,
      duration_seconds,
      transcript: String(transcript || ""),
      summaryRaw,
      vapiCallId: vapiCallId || `unknown-${Date.now()}`,
      patientRow,
      doctor_email,
    });

    console.log("[Webhook] processed call for patient:", patient_id);
    return res.json({ received: true });
  } catch (e: any) {
    console.error("[Webhook] fatal error:", e);
    return res.status(200).json({ received: true, error: e?.message });
  }
});

export default router;
