import { Router } from "express";
import { authenticateRequest } from "../middlewares/auth.middleware.js";
import { requireEnv } from "../config/env.js";
import {
  normalizeReportData,
  mergeSymptomsFromTranscript,
  effectiveCallTranscript,
  generateSchedules,
} from "../utils/helpers.js";
import { generateReportPdfBuffer } from "../services/pdf.service.js";
import { cleanTranscriptToEnglish, generateStructuredReport } from "../services/llm.service.js";
import { unwrapVapiCallResponse, buildTranscriptFromVapiCall } from "../services/vapi.service.js";
import { broadcastReport } from "../services/websocket.service.js";

// ─── Call Routes ─────────────────────────────────────────────────────────────

const router = Router();

/** Register `/api/calls/list` before any `/api/calls/:callId/...` route (Express matches in order). */
router.get("/api/calls/list", async (req, res) => {
  try {
    const authHeader = String(req.headers.authorization || "");
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!accessToken) return res.status(401).json({ error: "Missing Authorization Bearer token" });
    const authCtx = await authenticateRequest(accessToken);
    if (!authCtx) return res.status(401).json({ error: "Invalid token" });
    const { userId, supabase } = authCtx;
    const patientIdFilter = String((req.query as any).patientId || "").trim();
    const vapiCallIdFilter = String((req.query as any).vapiCallId || "").trim();

    let listQuery = supabase.from("calls").select("*").eq("docuuid", userId);
    if (patientIdFilter) listQuery = listQuery.eq("patient_id", patientIdFilter);
    if (vapiCallIdFilter) listQuery = listQuery.contains("vitals_data", { VapiCallId: vapiCallIdFilter });
    const { data: calls, error: callsErr } = await listQuery.order("created_at", { ascending: false });

    if (callsErr) {
      console.error("[CallsList] query error:", callsErr);
      return res.status(500).json({ error: callsErr.message });
    }

    const rows = calls || [];
    const patientIds = [...new Set(rows.map((c: any) => c.patient_id).filter(Boolean))];
    const agentIds = [...new Set(rows.map((c: any) => c.agent_id).filter(Boolean))];

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

    const merged = rows.map((c: any) => ({
      ...c,
      patient_name: pMap[c.patient_id] || "Unknown",
      agent_name: c.agent_id ? aMap[c.agent_id] || "Unknown" : "Unknown",
    }));

    return res.json({ calls: merged });
  } catch (e: any) {
    console.error("[CallsList] error:", e);
    return res.status(500).json({ error: e?.message || "Failed to load calls" });
  }
});

router.get("/api/calls/:callId/report/download", async (req, res) => {
  try {
    const { callId } = req.params;
    const authHeader = String(req.headers.authorization || "");
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!accessToken) return res.status(401).json({ error: "Missing Authorization Bearer token" });
    const authCtx = await authenticateRequest(accessToken);
    if (!authCtx) return res.status(401).json({ error: "Invalid token" });
    const { userId, supabase, userEmail } = authCtx;

    const { data: call, error } = await supabase
      .from("calls")
      .select("*")
      .eq("id", callId)
      .eq("docuuid", userId)
      .single();
    if (error || !call) return res.status(404).json({ error: "Call not found" });

    const reportRaw = call.vitals_data?.ReportData || null;
    const report = reportRaw ? normalizeReportData(reportRaw) : null;
    if (!report) return res.status(404).json({ error: "Report data not available for this call" });
    const patientName = String(call.vitals_data?.PatientName || "Unknown");
    const patientCondition = String(call.vitals_data?.PatientCondition || "N/A");
    const patientAge = String(call.vitals_data?.PatientAge || "");
    const doctorOnFile = String(call.vitals_data?.DoctorEmail || "").trim();
    const pdf = await generateReportPdfBuffer({
      callId: String(call.id),
      patientName,
      patientCondition,
      patientAge,
      durationSeconds: Number(call.duration_seconds || 0),
      transcriptSnippet: effectiveCallTranscript(call),
      report,
      doctorEmail: doctorOnFile || userEmail || undefined,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="doctor-report-${call.id}.pdf"`);
    return res.send(pdf);
  } catch (e: any) {
    console.error("[ReportDownload] error:", e);
    return res.status(500).json({ error: e?.message || "Report download failed" });
  }
});

router.get("/api/calls/:callId/detail", async (req, res) => {
  try {
    const { callId } = req.params;
    const authHeader = String(req.headers.authorization || "");
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!accessToken) return res.status(401).json({ error: "Missing Authorization Bearer token" });
    const authCtx = await authenticateRequest(accessToken);
    if (!authCtx) return res.status(401).json({ error: "Invalid token" });
    const { userId, supabase } = authCtx;

    const { data: call, error } = await supabase
      .from("calls")
      .select("*")
      .eq("id", callId)
      .eq("docuuid", userId)
      .single();

    if (error || !call) return res.status(404).json({ error: "Call not found" });

    const transcriptResolved = effectiveCallTranscript(call);

    const [patRes, agRes] = await Promise.all([
      call.patient_id
        ? supabase.from("patients").select("name").eq("id", call.patient_id).eq("docuuid", userId).maybeSingle()
        : Promise.resolve({ data: null }),
      call.agent_id
        ? supabase.from("agents").select("name").eq("id", call.agent_id).eq("docuuid", userId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return res.json({
      call: {
        ...call,
        transcript: transcriptResolved,
        patient_name: patRes.data?.name || "Unknown",
        agent_name: agRes.data?.name || "Unknown",
      },
    });
  } catch (e: any) {
    console.error("[CallDetailApi] error:", e);
    return res.status(500).json({ error: e?.message || "Failed to load call" });
  }
});

router.post("/api/calls/:callId/decision", async (req, res) => {
  try {
    const { callId } = req.params;
    const { decision } = req.body || {};
    if (!["approved", "denied"].includes(String(decision))) {
      return res.status(400).json({ error: "decision must be approved or denied" });
    }
    const authHeader = String(req.headers.authorization || "");
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!accessToken) return res.status(401).json({ error: "Missing Authorization Bearer token" });
    const authCtx = await authenticateRequest(accessToken);
    if (!authCtx) return res.status(401).json({ error: "Invalid token" });
    const { userId, supabase } = authCtx;

    const { data: call, error: callErr } = await supabase
      .from("calls")
      .select("*")
      .eq("id", callId)
      .eq("docuuid", userId)
      .single();
    if (callErr || !call) return res.status(404).json({ error: "Call not found" });

    const nextVitals = {
      ...(call.vitals_data || {}),
      DoctorDecision: decision,
      DoctorDecisionAt: new Date().toISOString(),
    };
    const { error: updateCallErr } = await supabase
      .from("calls")
      .update({ vitals_data: nextVitals })
      .eq("id", callId)
      .eq("docuuid", userId);
    if (updateCallErr) return res.status(500).json({ error: updateCallErr.message });

    const { data: alertRow } = await supabase
      .from("alerts")
      .select("id")
      .eq("docuuid", userId)
      .eq("patient_id", call.patient_id)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (alertRow?.id) {
      const { error: alertUpdateErr } = await supabase
        .from("alerts")
        .update({ status: decision })
        .eq("id", alertRow.id)
        .eq("docuuid", userId);
      if (alertUpdateErr) console.error("[Decision] alert update failed:", alertUpdateErr);
    }

    return res.json({ ok: true, decision });
  } catch (e: any) {
    console.error("[Decision] error:", e);
    return res.status(500).json({ error: e?.message || "Decision update failed" });
  }
});

/**
 * POST /api/calls/:callId/generate-report
 *
 * On-demand report generation pipeline for the CallDetail page.
 */
router.post("/api/calls/:callId/generate-report", async (req, res) => {
  try {
    const { callId } = req.params;
    const authHeader = String(req.headers.authorization || "");
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!accessToken) return res.status(401).json({ error: "Missing Authorization Bearer token" });
    const authCtx = await authenticateRequest(accessToken);
    if (!authCtx) return res.status(401).json({ error: "Invalid token" });
    const { userId, supabase } = authCtx;

    // 1. Load the call from DB
    const { data: call, error: callErr } = await supabase
      .from("calls")
      .select("*")
      .eq("id", callId)
      .eq("docuuid", userId)
      .single();
    if (callErr || !call) return res.status(404).json({ error: "Call not found" });

    // 2. Resolve transcript: prefer body.transcript (frontend already has it) → stored in DB
    const bodyTranscript = String((req.body as any)?.transcript || "").trim();
    const userPrompt = String((req.body as any)?.userPrompt || "").trim();
    let rawTranscript = bodyTranscript || effectiveCallTranscript(call);

    // If still empty, try fetching live from Vapi
    const storedVapiId = String(call.vitals_data?.VapiCallId || "").trim();
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!rawTranscript && storedVapiId && uuidRe.test(storedVapiId)) {
      try {
        const vapiApiKey = requireEnv("VAPI_API_KEY");
        const vapiResp = await fetch(`https://api.vapi.ai/call/${storedVapiId}`, {
          headers: { Authorization: `Bearer ${vapiApiKey}` },
        });
        if (vapiResp.ok) {
          const vapiBody = unwrapVapiCallResponse(await vapiResp.json().catch(() => ({})));
          rawTranscript = buildTranscriptFromVapiCall(vapiBody);
        }
      } catch (e) {
        console.warn("[GenerateReport] Vapi live fetch failed, using stored:", e);
      }
    }

    if (!rawTranscript) {
      return res.status(400).json({
        error: "No transcript available for this call. Cannot generate report without a transcript.",
      });
    }

    console.log("[GenerateReport] starting pipeline for call:", callId, "| raw transcript chars:", rawTranscript.length);

    // 3. Step 1 — Clean & translate the transcript to English
    const cleanedTranscript = await cleanTranscriptToEnglish(rawTranscript);

    // 4. Gather patient chart for context
    const { data: patientRow } = call.patient_id
      ? await supabase.from("patients").select("*").eq("id", call.patient_id).eq("docuuid", userId).single()
      : { data: null };

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

    // 5. Step 2 — Generate the structured clinical report from cleaned transcript
    const reportRaw = await generateStructuredReport(cleanedTranscript, chartJson, userPrompt);
    const report = normalizeReportData(reportRaw);
    const symptoms = mergeSymptomsFromTranscript(report.symptoms, cleanedTranscript);

    console.log("[GenerateReport] report generated | risk:", report.risk_level, "| symptoms:", symptoms.length);

    // 5.5 Generate appointment and follow up schedules
    const schedules = generateSchedules();
    const appointment = schedules.appointment;
    const follow_up_call = schedules.follow_up_call;
    console.log("[GenerateReport] appointment scheduled:", appointment.date, "| follow up call:", follow_up_call.date);

    // 6. Persist the cleaned transcript + new report into vitals_data
    const updatedVitals = {
      ...(call.vitals_data || {}),
      CleanedTranscript: cleanedTranscript,
      ReportData: { ...report, symptoms, appointment, follow_up_call },
      Summary: report.summary,
      Diagnosis: report.diagnosis,
      Symptoms: symptoms,
      RelevantHistory: report.relevant_history,
      ClinicalReasoning: report.clinical_reasoning,
      DifferentialDiagnosis: report.differential_diagnosis,
      FollowUpPlan: report.follow_up_plan,
      ActionRequired: report.action_required,
      Appointment: appointment,
      FollowUpCall: follow_up_call,
      ReportGeneratedAt: new Date().toISOString(),
      ReportPipeline: "clean-then-generate",
    };

    const { error: updateErr } = await supabase
      .from("calls")
      .update({
        transcript: cleanedTranscript,
        vitals_data: updatedVitals,
      })
      .eq("id", callId)
      .eq("docuuid", userId);

    if (updateErr) {
      console.error("[GenerateReport] DB update failed:", updateErr);
      return res.status(500).json({ error: updateErr.message });
    }

    // 7. Also update the matching alert severity if one exists
    if (call.patient_id) {
      const { data: alertRow } = await supabase
        .from("alerts")
        .select("id")
        .eq("docuuid", userId)
        .eq("patient_id", call.patient_id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (alertRow?.id) {
        await supabase
          .from("alerts")
          .update({
            alert_type: report.alert_type,
            severity: report.risk_level,
          })
          .eq("id", alertRow.id)
          .eq("docuuid", userId);
      }
    }

    // Broadcast the generated report to any external applications via WebSocket
    broadcastReport(call.id, updatedVitals);

    console.log("[GenerateReport] done for call:", callId);

    return res.json({
      ok: true,
      cleanedTranscript,
      report: { ...report, symptoms, appointment, follow_up_call },
    });
  } catch (e: any) {
    console.error("[GenerateReport] error:", e);
    return res.status(500).json({ error: e?.message || "Report generation failed" });
  }
});

export default router;
