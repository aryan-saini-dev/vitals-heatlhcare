import { requireEnv } from "../config/env.js";

// ─── Vapi Data Parsing & API Interaction ─────────────────────────────────────

export async function detectAssistantMisconfig(assistantId: string): Promise<string | null> {
  try {
    const apiKey = requireEnv("VAPI_API_KEY");
    const resp = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!resp.ok) return null;
    const assistant: any = await resp.json();
    const provider = String(assistant?.model?.provider || "");
    const modelUrl = String(assistant?.model?.url || "");
    // Common misconfiguration: webhook URL is placed in custom-llm model URL.
    if (
      provider === "custom-llm" &&
      /\/api\/vapi\/webhook\/?$/i.test(modelUrl)
    ) {
      return "Assistant model is misconfigured: custom-llm URL points to /api/vapi/webhook. Use a real LLM endpoint for model URL, and keep /api/vapi/webhook only as Vapi server webhook URL.";
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Vapi GET /call and webhooks expose metadata in different shapes; outbound calls also put patientId in variableValues.
 */
export function extractVapiPersistContext(vapiBody: any): {
  patient_id: string | null;
  agent_id: string | null;
  metadataDocuuid: string | null;
  doctor_email: string | null;
} {
  const metadata =
    vapiBody?.metadata ||
    vapiBody?.call?.metadata ||
    vapiBody?.data?.metadata ||
    {};
  const assistantOverrides =
    vapiBody?.assistantOverrides || vapiBody?.call?.assistantOverrides || {};
  const variableValues = assistantOverrides?.variableValues || {};

  const patient_id =
    metadata?.patient_id != null
      ? String(metadata.patient_id).trim()
      : metadata?.patientId != null
        ? String(metadata.patientId).trim()
        : variableValues?.patientId != null
          ? String(variableValues.patientId).trim()
          : variableValues?.patient_id != null
            ? String(variableValues.patient_id).trim()
            : null;

  const agent_id =
    metadata?.agent_id != null
      ? String(metadata.agent_id).trim()
      : metadata?.agentId != null
        ? String(metadata.agentId).trim()
        : null;

  const metadataDocuuid =
    metadata?.docuuid != null && String(metadata.docuuid).trim() !== ""
      ? String(metadata.docuuid).trim()
      : null;

  const doctor_emailRaw =
    metadata?.doctor_email ?? metadata?.doctorEmail ?? variableValues?.doctor_email ?? "";
  const doctor_email =
    doctor_emailRaw != null && String(doctor_emailRaw).trim() !== ""
      ? String(doctor_emailRaw).trim()
      : null;

  return {
    patient_id: patient_id || null,
    agent_id: agent_id || null,
    metadataDocuuid,
    doctor_email,
  };
}

/** Vapi list/get payloads occasionally nest the call under `call` or `data`. */
export function unwrapVapiCallResponse(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;
  if (raw.call && typeof raw.call === "object") return raw.call;
  if (raw.data && typeof raw.data === "object" && raw.data.id) return raw.data;
  return raw;
}

export function normalizeVapiMessageContent(m: any): string {
  const c = m?.message ?? m?.content ?? m?.text;
  if (typeof c === "string") return c.trim();
  if (Array.isArray(c)) {
    return c
      .map((part: any) => {
        if (typeof part === "string") return part;
        if (part?.text) return String(part.text);
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  if (c && typeof c === "object" && typeof (c as any).text === "string") return String((c as any).text);
  return "";
}

export function transcriptFromMessagesArray(messages: any[]): string {
  if (!Array.isArray(messages) || !messages.length) return "";
  const lines: string[] = [];
  for (const m of messages) {
    const role = (m.role || m.type || "unknown").toString().toLowerCase();
    const text = normalizeVapiMessageContent(m);
    if (!text) continue;
    lines.push(`${role}: ${text}`);
  }
  return lines.join("\n");
}

/** Collect transcript text from all common Vapi call shapes (phone + web). */
export function buildTranscriptFromVapiCall(body: any): string {
  if (!body || typeof body !== "object") return "";
  const direct = typeof body.transcript === "string" ? body.transcript.trim() : "";
  if (direct) return direct;
  const art = body.artifact;
  if (art && typeof art.transcript === "string" && art.transcript.trim()) return art.transcript.trim();
  if (art && Array.isArray(art.messages)) {
    const t = transcriptFromMessagesArray(art.messages);
    if (t) return t;
  }
  if (Array.isArray(body.messages)) {
    const t = transcriptFromMessagesArray(body.messages);
    if (t) return t;
  }
  const eoc = body.endOfCallReport || body.end_of_call_report;
  if (eoc && typeof eoc.transcript === "string" && eoc.transcript.trim()) return eoc.transcript.trim();
  if (eoc && Array.isArray(eoc.messages)) {
    const t = transcriptFromMessagesArray(eoc.messages);
    if (t) return t;
  }
  return "";
}

export function extractVapiDurationSeconds(body: any): number {
  if (!body || typeof body !== "object") return 0;
  const candidates = [
    body.durationSeconds,
    body.duration,
    body.artifact?.durationSeconds,
    body.endOfCallReport?.durationSeconds,
    body.end_of_call_report?.durationSeconds,
  ];
  for (const raw of candidates) {
    if (raw == null) continue;
    let n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (n > 48 * 3600) continue;
    if (n > 36_000) n = Math.round(n / 1000);
    return Math.round(n);
  }
  const started = body.startedAt || body.started_at;
  const ended = body.endedAt || body.ended_at;
  if (started && ended) {
    const a = new Date(String(started)).getTime();
    const b = new Date(String(ended)).getTime();
    if (Number.isFinite(a) && Number.isFinite(b) && b > a) return Math.round((b - a) / 1000);
  }
  return 0;
}
