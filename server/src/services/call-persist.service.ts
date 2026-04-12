import { REPORTS_BUCKET } from "../config/env.js";
import {
  normalizeReportData,
  mergeSymptomsFromTranscript,
  type ReportData,
} from "../utils/helpers.js";
import { generateReportPdfBuffer } from "./pdf.service.js";
import { sendWhatsappPdf } from "./whatsapp.service.js";
import { isWhatsAppReady } from "./whatsapp.service.js";
import { broadcastReport } from "./websocket.service.js";

// ─── Call Persistence & Alert Creation ───────────────────────────────────────

export async function persistCallAndAlertAfterAnalysis(input: {
  supabase: any;
  docuuid: string;
  patient_id: string;
  agent_id: string | null;
  duration_seconds: number;
  transcript: string;
  summaryRaw: any;
  vapiCallId: string;
  patientRow: any | null;
  doctor_email?: string | null;
}) {
  const {
    supabase,
    docuuid,
    patient_id,
    agent_id,
    duration_seconds,
    transcript,
    summaryRaw,
    vapiCallId,
    patientRow,
    doctor_email,
  } = input;

  const summary = normalizeReportData(summaryRaw);
  const transcriptNorm = String(transcript || "").trim();
  const reportData: ReportData = {
    ...summary,
    symptoms: mergeSymptomsFromTranscript(summary.symptoms, transcriptNorm),
  };

  const doctorEmailNorm = String(doctor_email || "").trim();

  const vitals_data: Record<string, any> = {
    ...(reportData.vitals_data || {}),
    Symptoms: reportData.symptoms,
    Summary: reportData.summary,
    Diagnosis: reportData.diagnosis,
    RelevantHistory: reportData.relevant_history,
    ClinicalReasoning: reportData.clinical_reasoning,
    DifferentialDiagnosis: reportData.differential_diagnosis,
    FollowUpPlan: reportData.follow_up_plan,
    ActionRequired: reportData.action_required,
    ReportData: reportData,
    PatientName: patientRow?.name || "",
    PatientCondition: patientRow?.condition || "",
    PatientAge: patientRow?.age != null ? String(patientRow.age) : "",
    VapiCallId: vapiCallId,
    PdfGeneratedAt: new Date().toISOString(),
    CallTranscript: transcriptNorm,
    ...(doctorEmailNorm ? { DoctorEmail: doctorEmailNorm } : {}),
  };

  console.log(
    "[CallPersist] transcript chars:",
    transcriptNorm.length,
    "symptom items:",
    reportData.symptoms.length,
  );

  try {
    const pdfBuffer = await generateReportPdfBuffer({
      callId: vapiCallId,
      patientName: String(patientRow?.name || vitals_data.PatientName || "Unknown"),
      patientCondition: String(patientRow?.condition || vitals_data.PatientCondition || "N/A"),
      patientAge: patientRow?.age != null ? String(patientRow.age) : vitals_data.PatientAge,
      durationSeconds: duration_seconds,
      transcriptSnippet: transcriptNorm,
      report: reportData,
      doctorEmail: doctorEmailNorm || undefined,
    });
    const uploadPath = `doctor-reports/${docuuid}/${patient_id}/${vapiCallId}-${Date.now()}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from(REPORTS_BUCKET)
      .upload(uploadPath, pdfBuffer, { contentType: "application/pdf", upsert: true });
    if (!uploadErr) {
      vitals_data.ReportPdfPath = uploadPath;
      vitals_data.PdfStoredInStorage = true;
      console.log("[CallPersist] PDF uploaded:", uploadPath);
      // ── WhatsApp: send PDF to patient's registered number ──
      if (isWhatsAppReady() && patientRow?.phone_number) {
        sendWhatsappPdf(
          patientRow.phone_number,
          pdfBuffer,
          `${patientRow.name || "Patient"} — Clinical Report`,
          `*Vitals AI Report* for ${patientRow.name || "your patient"}\n` +
          `Risk: *${reportData.risk_level?.toUpperCase() || "N/A"}* | ${reportData.alert_type || ""}\n` +
          `Summary: ${reportData.summary || "See attached PDF."}`,
        ).catch((e: any) => console.error("[WhatsApp] send failed:", e?.message || e));
      }
      // ─────────────────────────────────────────────────────
    } else {
      vitals_data.PdfStoredInStorage = false;
      vitals_data.PdfStorageError = uploadErr.message;
      console.error("[CallPersist] report upload failed:", uploadErr.message);
    }
  } catch (reportErr) {
    vitals_data.PdfStoredInStorage = false;
    vitals_data.PdfGenerationError = String(reportErr);
    console.error("[CallPersist] PDF generation failed:", reportErr);
  }

  const { data: inserted, error: callErr } = await supabase
    .from("calls")
    .insert({
      docuuid,
      patient_id,
      agent_id: agent_id ? String(agent_id) : null,
      duration_seconds,
      transcript: transcriptNorm,
      vitals_data,
    })
    .select("id")
    .single();

  if (callErr) {
    console.error("[CallPersist] call insert failed:", callErr);
    return { ok: false as const, error: callErr.message };
  }

  const { error: alertErr } = await supabase.from("alerts").insert({
    docuuid,
    patient_id,
    agent_id: agent_id ? String(agent_id) : null,
    alert_type: reportData.alert_type,
    severity: reportData.risk_level,
    status: "open",
  });
  if (alertErr) console.error("[CallPersist] alert insert failed:", alertErr);

  console.log("[CallPersist] stored call for patient:", patient_id, "db id:", inserted?.id);
  
  // Broadcast the newly created call report via WebSocket
  if (inserted?.id) {
    broadcastReport(inserted.id, reportData);
  }
  
  return { ok: true as const, callId: inserted?.id as string };
}
