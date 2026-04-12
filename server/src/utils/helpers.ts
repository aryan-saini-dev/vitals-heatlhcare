// ─── Pure utility functions ───────────────────────────────────────────────────

export function normalizeE164(input: string): string {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return "+" + trimmed.slice(1).replace(/\D/g, "");
  return "+" + trimmed.replace(/\D/g, "");
}

export function parseVapiError(e: any) {
  const body =
    e?.body ||
    e?.response?.data ||
    e?.response?.body ||
    e?.data ||
    null;
  const message =
    body?.message ||
    e?.message ||
    "Outbound call failed";
  const statusCode = Number(body?.statusCode || e?.statusCode || 500);
  return { statusCode, message, body };
}

export function parseJsonFromModelText(text: string): any {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const rawJson = jsonMatch ? jsonMatch[1] : text;
  return JSON.parse(rawJson.trim());
}

export function parseFutureDate(minDaysOut: number, maxDaysOut: number) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const now = new Date();
  let d = new Date(now);
  d.setDate(d.getDate() + 1); // start tomorrow
  
  // Collect working days
  const workingDays: Date[] = [];
  while (workingDays.length < maxDaysOut) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) workingDays.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }

  // Filter based on min/max indices
  const validCandidates = workingDays.slice(minDaysOut - 1, maxDaysOut);
  const chosen = validCandidates[Math.floor(Math.random() * validCandidates.length)] || workingDays[0];

  const halfHours = [0, 30];
  const hour = 16 + Math.floor(Math.random() * 4); // 16, 17, 18, 19
  const minute = halfHours[Math.floor(Math.random() * 2)];
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour > 12 ? hour - 12 : hour;
  const timeStr = `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`;

  const dateStr = `${days[chosen.getDay()]}, ${months[chosen.getMonth()]} ${chosen.getDate()}, ${chosen.getFullYear()}`;
  chosen.setHours(hour, minute, 0, 0);

  return {
    date: dateStr,
    time: timeStr,
    isoDate: chosen.toISOString(),
    dayOfWeek: days[chosen.getDay()],
  };
}

export function generateSchedules() {
  return {
    follow_up_call: parseFutureDate(1, 2), // 1-2 days out
    appointment: parseFutureDate(3, 5),    // 3-5 days out
  };
}

export function safeString(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "number") return val.toString();
  if (Array.isArray(val)) return val.map(item => safeString(item)).join(", ");
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return "[Object]";
    }
  }
  return String(val);
}

// ─── Report Data Types & Normalization ───────────────────────────────────────

export type ReportData = {
  summary: string;
  diagnosis: string;
  risk_level: string;
  alert_type: string;
  symptoms: string[];
  vitals_data: Record<string, any>;
  action_required: string;
  /** Relevant chronic / prior context from chart + call */
  relevant_history: string;
  /** Brief clinical reasoning (not legal advice) */
  clinical_reasoning: string;
  /** Optional differentials for doctor review */
  differential_diagnosis: string[];
  /** Structured follow-up plan */
  follow_up_plan: string;
  /** Auto-scheduled follow-up appointment (Mon-Fri, 4-8 PM) */
  appointment?: {
    date: string; time: string; isoDate: string; dayOfWeek: string;
  };
  /** Auto-scheduled AI follow-up phone call */
  follow_up_call?: {
    date: string; time: string; isoDate: string; dayOfWeek: string;
  };
};

export function normalizeReportData(raw: any): ReportData {
  const d = raw || {};
  return {
    summary: safeString(d.summary || ""),
    diagnosis: safeString(d.diagnosis || ""),
    risk_level: safeString(d.risk_level || "medium").toLowerCase(),
    alert_type: safeString(d.alert_type || ""),
    symptoms: Array.isArray(d.symptoms) ? d.symptoms.map(safeString) : [],
    vitals_data: (d.vitals_data || {}) as Record<string, any>,
    action_required: safeString(d.action_required || ""),
    relevant_history: safeString(d.relevant_history || ""),
    clinical_reasoning: safeString(d.clinical_reasoning || ""),
    differential_diagnosis: Array.isArray(d.differential_diagnosis)
      ? d.differential_diagnosis.map(safeString)
      : [],
    follow_up_plan: safeString(d.follow_up_plan || ""),
  };
}

// ─── Transcript utilities ────────────────────────────────────────────────────

/** Pull symptom-sized snippets from patient-side lines in the saved transcript (user/patient/customer roles). */
export function extractSymptomsFromPatientLines(transcript: string): string[] {
  const text = (transcript || "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];
  const lines = text.split("\n");
  const out: string[] = [];
  const patientRe = /^(user|patient|customer)\s*:\s*(.+)$/i;
  for (const line of lines) {
    const m = line.match(patientRe);
    if (!m) continue;
    const content = m[2].trim();
    if (content.length < 4) continue;
    if (/^(ok|yeah|yes|no|thanks|thank you|uh[\s-]?huh)\.?$/i.test(content)) continue;
    const clipped = content.length > 280 ? `${content.slice(0, 277)}…` : content;
    out.push(clipped);
  }
  return [...new Set(out.map((s) => s.trim()))].filter(Boolean).slice(0, 15);
}

/** Return AI-extracted symptom labels and prevent appending raw transcript sentences. */
export function mergeSymptomsFromTranscript(aiSymptoms: string[], transcript: string): string[] {
  const merged: string[] = aiSymptoms.map((s) => s.trim()).filter(Boolean);
  return merged;
}

export function effectiveCallTranscript(call: { transcript?: string | null; vitals_data?: any }): string {
  const col = call.transcript != null ? String(call.transcript).trim() : "";
  if (col) return col;
  return String(call.vitals_data?.CallTranscript || "").trim();
}
