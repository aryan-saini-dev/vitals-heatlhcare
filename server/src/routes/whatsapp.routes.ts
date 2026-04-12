import { Router } from "express";
import { authenticateRequest } from "../middlewares/auth.middleware.js";
import { isWhatsAppReady, isWhatsAppInitialized, sendWhatsappPdf } from "../services/whatsapp.service.js";
import { normalizeReportData, effectiveCallTranscript } from "../utils/helpers.js";
import { generateReportPdfBuffer } from "../services/pdf.service.js";

// ─── WhatsApp Routes ─────────────────────────────────────────────────────────

const router = Router();

router.get("/api/whatsapp/status", (_req, res) => {
  res.json({ ready: isWhatsAppReady(), initialized: isWhatsAppInitialized() });
});

/** POST /api/whatsapp/send-report/:callId
 *  Manually send a call's PDF report to the patient's WhatsApp number. */
router.post("/api/whatsapp/send-report/:callId", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const auth = await authenticateRequest(token);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const { callId } = req.params;
    const { supabase } = auth;

    // Fetch the call
    const { data: call, error: callErr } = await supabase
      .from("calls")
      .select("id, patient_id, vitals_data, docuuid, duration_seconds, transcript")
      .eq("id", callId)
      .single();

    if (callErr || !call) {
      return res.status(404).json({ error: "Call not found" });
    }

    // Fetch patient with phone_number
    const { data: patient } = await supabase
      .from("patients")
      .select("id, name, phone_number, condition")
      .eq("id", call.patient_id)
      .single();

    if (!patient?.phone_number) {
      return res.status(400).json({
        error: "Patient has no phone_number registered. Add it in the patients table first.",
      });
    }

    if (!isWhatsAppReady()) {
      return res.status(503).json({
        error: "WhatsApp client is not ready. Check server terminal — you may need to scan the QR code.",
      });
    }

    // Dynamically generate the PDF using the exact same logic as download
    const reportRaw = call.vitals_data?.ReportData || null;
    const report = reportRaw ? normalizeReportData(reportRaw) : null;
    if (!report) {
      return res.status(400).json({ error: "No AI Report data available for this call." });
    }

    const patientName = String(call.vitals_data?.PatientName || patient.name || "Unknown");
    const patientCondition = String(call.vitals_data?.PatientCondition || patient.condition || "N/A");
    const patientAge = String(call.vitals_data?.PatientAge || "");
    const doctorOnFile = String(call.vitals_data?.DoctorEmail || "").trim();

    const pdfBuffer = await generateReportPdfBuffer({
      callId: String(call.id),
      patientName,
      patientCondition,
      patientAge,
      durationSeconds: Number(call.duration_seconds || 0),
      transcriptSnippet: effectiveCallTranscript(call),
      report,
      doctorEmail: doctorOnFile || undefined,
    });
    const summary = String(call.vitals_data?.Summary || "See attached report.");
    const alertType = String(call.vitals_data?.ReportData?.alert_type || "");
    const riskLevel = String(call.vitals_data?.ReportData?.risk_level || "").toUpperCase();

    let scheduleText = "";
    const appt = report?.appointment || call.vitals_data?.Appointment;
    if (appt) {
      scheduleText += `\n\n📅 *Clinic Appointment Scheduled*:\nDate: ${appt.date}\nTime: ${appt.time}\nPlease arrive 10 minutes early at the clinic.`;
    }
    
    const followCall = report?.follow_up_call || call.vitals_data?.FollowUpCall;
    if (followCall) {
      scheduleText += `\n\n📞 *Next AI Follow-up Call*:\nDate: ${followCall.date}\nTime: ${followCall.time}\nYou will receive an automated check-in call directly to your registered phone number.`;
    }

    // 1. Send the Report PDF with schedule details in the description
    await sendWhatsappPdf(
      patient.phone_number,
      pdfBuffer,
      `${patient.name || "Patient"} — Clinical Report.pdf`,
      `*Vitals AI Report* for ${patient.name || "Patient"}\n` +
      (riskLevel ? `Risk: *${riskLevel}* | ${alertType}\n` : "") +
      `Summary: ${summary}` + scheduleText
    );

    return res.json({ ok: true, sentTo: patient.phone_number });
  } catch (e: any) {
    console.error("[WhatsApp] manual send error:", e);
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
});

export default router;
