import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { apiUrl } from "@/lib/api";
import { ArrowLeft, Phone, Activity, Heart, Wind, Stethoscope, RefreshCw, FileText, Sparkles, Loader2, MessageSquare, Mic, MicOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { safeRender } from "@/lib/renderUtils";


/** Split stored transcript into display blocks (handles `user:` / `assistant:` as well as Agent:/Patient:). */
function transcriptToDisplayBlocks(text: string): string[] {
  const raw = (text || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return [];
  if (raw.includes("\n\n")) {
    return raw
      .split(/\n\n+/)
      .map((b) => b.trim())
      .filter(Boolean);
  }
  const lines = raw.split("\n").filter(Boolean);
  const blocks: string[] = [];
  let cur = "";
  const speakerRe =
    /^(agent|patient|user|bot|assistant|customer|system|tool|ai)\s*:\s*/i;
  for (const line of lines) {
    if (speakerRe.test(line)) {
      if (cur) blocks.push(cur.trim());
      cur = line;
    } else {
      cur = cur ? `${cur}\n${line}` : line;
    }
  }
  if (cur.trim()) blocks.push(cur.trim());
  return blocks.length ? blocks : [raw];
}

export default function CallDetail() {
  const { id } = useParams();
  const { session, isLoading: authLoading } = useAuth();
  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [liveTranscript, setLiveTranscript] = useState<string | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptSource, setTranscriptSource] = useState<"vapi" | "stored" | null>(null);

  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [cleanedTranscript, setCleanedTranscript] = useState<string | null>(null);

  const [waSending, setWaSending] = useState(false);
  const [waStatus, setWaStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  function toggleListening() {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition API is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) {
        setRegeneratePrompt((prev) => (prev + " " + finalTranscript.trim()).trim() + " ");
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }


  useEffect(() => {
    if (!id) { setLoading(false); return; }
    if (authLoading) return;
    if (!session?.access_token) { setLoading(false); setCall(null); return; }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const resp = await fetch(apiUrl(`/api/calls/${encodeURIComponent(id)}/detail`), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await resp.json().catch(() => ({}));
        if (!cancelled) {
          if (resp.ok && data.call) setCall(data.call);
          else setCall(null);
        }
      } catch {
        if (!cancelled) setCall(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session, id, authLoading]);

  async function fetchLiveTranscript(vapiCallId: string) {
    if (!vapiCallId) return;
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(vapiCallId)) { setTranscriptSource("stored"); return; }

    setTranscriptLoading(true);
    try {
      const resp = await fetch(apiUrl(`/api/vapi/call/${encodeURIComponent(vapiCallId)}/transcript`));
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const text = String(data.transcript || "").trim();
        if (text && text !== "No transcript found.") {
          setLiveTranscript(text);
          setTranscriptSource("vapi");
          return;
        }
      }
    } catch { /* fall through */ } finally {
      setTranscriptLoading(false);
    }
    setLiveTranscript(null);
    setTranscriptSource("stored");
  }

  useEffect(() => {
    if (!call) return;
    const vapiCallId = String(call.vitals_data?.VapiCallId || "").trim();
    if (vapiCallId) void fetchLiveTranscript(vapiCallId);
    else setTranscriptSource("stored");
  }, [call]);

  if (loading) return <div className="p-8 text-center text-muted-foreground font-bold animate-pulse">Loading call log...</div>;
  if (!call) return <div className="p-8 text-center text-muted-foreground font-bold">Call record not found.</div>;

  const vitals = call.vitals_data || {};
  const report = vitals.ReportData || null;
  const doctorDecision = vitals.DoctorDecision || null;
  const transcriptText = (liveTranscript || String(call.transcript || vitals.CallTranscript || "")).trim();
  const vapiCallId = String(vitals.VapiCallId || "").trim();
  const hasAiNarrative =
    report || vitals.Summary || vitals.Diagnosis ||
    (Array.isArray(vitals.Symptoms) && vitals.Symptoms.length > 0);

  const vitalsDisplayEntries = Object.entries(vitals).filter(([key, value]) => {
    if ([
      "ReportData","Symptoms","Summary","Diagnosis","RelevantHistory","ClinicalReasoning",
      "DifferentialDiagnosis","FollowUpPlan","ActionRequired","PatientName","PatientCondition",
      "PatientAge","VapiCallId","ReportPdfPath","PdfStoredInStorage","PdfStorageError",
      "PdfGenerationError","PdfGeneratedAt","DoctorDecision","DoctorDecisionAt","DoctorEmail",
      "CallTranscript","RiskLevel","AlertType","ReportPipeline","CleanedTranscript","ReportGeneratedAt",
      "Appointment",
    ].includes(key)) return false;
    if (value !== null && typeof value === "object") return false;
    return true;
  });

  async function downloadReport() {
    if (!session || !id) return;
    const resp = await fetch(apiUrl(`/api/calls/${id}/report/download`), {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!resp.ok) return;
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doctor-report-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function setDecision(decision: "approved" | "denied") {
    if (!session || !id) return;
    const resp = await fetch(apiUrl(`/api/calls/${id}/decision`), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ decision }),
    });
    if (!resp.ok) return;
    setCall((prev: any) => ({
      ...prev,
      vitals_data: { ...(prev.vitals_data || {}), DoctorDecision: decision },
    }));
  }

  async function generateReport() {
    setIsRegenerateModalOpen(false); // Close modal automatically
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    if (!session || !id) return;
    setReportGenerating(true);
    setReportError(null);
    try {
      const resp = await fetch(apiUrl(`/api/calls/${encodeURIComponent(id)}/generate-report`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ transcript: transcriptText, userPrompt: regeneratePrompt }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) { setReportError(data.error || "Report generation failed"); return; }
      setGeneratedReport(data.report);
      setCleanedTranscript(data.cleanedTranscript || null);
      setCall((prev: any) => ({
        ...prev,
        transcript: data.cleanedTranscript || prev.transcript,
        vitals_data: {
          ...(prev.vitals_data || {}),
          ReportData: data.report,
          Summary: data.report?.summary,
          Diagnosis: data.report?.diagnosis,
          Symptoms: data.report?.symptoms,
          RelevantHistory: data.report?.relevant_history,
          ClinicalReasoning: data.report?.clinical_reasoning,
          DifferentialDiagnosis: data.report?.differential_diagnosis,
          FollowUpPlan: data.report?.follow_up_plan,
          ActionRequired: data.report?.action_required,
          Appointment: data.report?.appointment,
          RiskLevel: data.report?.risk_level,
          AlertType: data.report?.alert_type,
          CleanedTranscript: data.cleanedTranscript,
          ReportGeneratedAt: new Date().toISOString(),
          ReportPipeline: "clean-then-generate",
        },
      }));
    } catch (e: any) {
      setReportError(e?.message || "Report generation failed");
    } finally {
      setReportGenerating(false);
    }
  }

  // suppress unused warning
  void cleanedTranscript;
  void generatedReport;

  async function sendOnWhatsApp() {
    if (!session || !id) return;
    setWaSending(true);
    setWaStatus(null);
    try {
      const resp = await fetch(apiUrl(`/api/whatsapp/send-report/${encodeURIComponent(id)}`), {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok) {
        setWaStatus({ type: "success", msg: `✅ Report sent to ${data.sentTo || "patient's WhatsApp"}` });
      } else {
        setWaStatus({ type: "error", msg: data.error || "Failed to send" });
      }
    } catch (e: any) {
      setWaStatus({ type: "error", msg: e?.message || "Network error" });
    } finally {
      setWaSending(false);
    }
  }


  // ─────────────────────────────────────────────
  // Panel height — consistent across all 3 panels
  const panelStyle = { height: "clamp(420px, 62vh, 800px)" } as const;

  return (
    <div className="space-y-6">
      <Dialog open={isRegenerateModalOpen} onOpenChange={(open) => {
        setIsRegenerateModalOpen(open);
        if (!open && isListening && recognitionRef.current) {
          recognitionRef.current.stop();
          setIsListening(false);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-secondary" />
              Customize AI Report Regeneration
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Provide specific instructions on what the AI should change or format differently in the updated report.
            </p>
            <div className="relative">
              <Textarea 
                placeholder="e.g. 'Add that the patient also complained of severe headaches' or 'Translate the summary into Spanish'"
                className="min-h-[120px] pr-12 focus-visible:ring-ring"
                value={regeneratePrompt}
                onChange={(e) => setRegeneratePrompt(e.target.value)}
              />
              <button 
                type="button"
                onClick={toggleListening}
                className={`absolute bottom-3 right-3 p-2 rounded-full transition-colors ${isListening ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-muted hover:bg-muted-foreground/10 text-muted-foreground'}`}
                title={isListening ? "Stop listening" : "Start Voice Typing"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegenerateModalOpen(false)}>Cancel</Button>
            <Button onClick={generateReport} className="bg-primary hover:bg-medical-blue-hover text-white gap-2">
              <RefreshCw className="w-4 h-4" /> Apply & Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Link
        to="/dashboard/calls"
        className="inline-flex items-center text-muted-foreground hover:text-foreground font-bold transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Calls
      </Link>

      {/* ── Top Row: Interaction Review (full width) ────────────────── */}
      <div className="bg-card border-2 border-border shadow-soft rounded-xl p-5 sm:p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-40 h-40 bg-quaternary opacity-10 rounded-full blur-2xl group-hover:scale-110 transition-transform pointer-events-none" />

        {/* Title + meta */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 relative z-10">
          <div className="flex items-center gap-4 shrink-0">
            <div className="w-12 h-12 bg-quaternary rounded-full flex items-center justify-center text-white border-2 border-border shadow-pop shrink-0">
              <Phone className="w-6 h-6 animate-wiggle" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground leading-tight">
              Interaction Review
            </h1>
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-x-6">
            {[
              { label: "Patient", val: call.patient_name },
              { label: "Agent", val: call.agent_name },
              { label: "Duration", val: `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` },
              { label: "Decision", val: doctorDecision || "Pending" },
            ].map(({ label, val }) => (
              <div key={label} className="flex flex-col">
                <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-0.5">{label}</span>
                <span className="font-extrabold truncate uppercase text-sm">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-2 relative z-10">
          {!doctorDecision && (
            <>
              <button type="button" onClick={() => setDecision("approved")} className="px-3 py-1.5 text-xs font-bold border-2 border-border rounded bg-quaternary/15 hover:bg-quaternary/25 transition-colors">Approve</button>
              <button type="button" onClick={() => setDecision("denied")} className="px-3 py-1.5 text-xs font-bold border-2 border-border rounded bg-destructive/10 hover:bg-destructive/15 transition-colors">Deny</button>
            </>
          )}
          <button type="button" onClick={downloadReport} className="px-3 py-1.5 text-xs font-bold border-2 border-border rounded bg-background hover:bg-muted transition-colors">
            <span className="inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Download PDF</span>
          </button>
          <button
            type="button"
            onClick={generateReport}
            disabled={reportGenerating || !transcriptText}
            className="px-3 py-1.5 text-xs font-bold border-2 border-border rounded bg-secondary/15 hover:bg-secondary/25 text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!transcriptText ? "No transcript available" : "Clean transcript & generate AI report"}
          >
            <span className="inline-flex items-center gap-1">
              {reportGenerating
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                : <><Sparkles className="w-3.5 h-3.5" /> Generate Report</>}
            </span>
          </button>
          {reportError && (
            <p className="w-full text-xs font-bold text-destructive mt-1 bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
              ⚠ {reportError}
            </p>
          )}
          <button
            type="button"
            id="send-whatsapp-btn"
            onClick={sendOnWhatsApp}
            disabled={waSending}
            className="px-3 py-1.5 text-xs font-bold border-2 border-border rounded bg-quaternary/15 hover:bg-quaternary/25 text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send the PDF report to the patient's WhatsApp number"
          >
            <span className="inline-flex items-center gap-1">
              {waSending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                : <><MessageSquare className="w-3.5 h-3.5" /> Send on WhatsApp</>}
            </span>
          </button>
          {waStatus && (
            <p className={`w-full text-xs font-bold mt-1 border rounded px-3 py-2 ${
              waStatus.type === "success"
                ? "text-foreground bg-quaternary/10 border-quaternary/30"
                : "text-destructive bg-destructive/10 border-destructive/20"
            }`}>
              {waStatus.msg}
            </p>
          )}
        </div>
      </div>


      {/* ── Bottom Row: 2 equal-height scrollable panels ─────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ─── Panel 1: AI Clinical Report ─── */}
        <div className="bg-card border-2 border-border shadow-soft rounded-xl flex flex-col" style={panelStyle}>
          {/* Sticky header */}
          <div className="shrink-0 px-5 sm:px-6 pt-5 pb-3 border-b-2 border-border border-dashed">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base sm:text-lg font-heading font-extrabold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-secondary shrink-0" /> AI Clinical Report
              </h3>
              <div className="flex items-center gap-2">
                {vitals.ReportPipeline === "clean-then-generate" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-secondary/15 text-foreground border border-secondary/30">
                    <Sparkles className="w-3 h-3" /> Processed
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsRegenerateModalOpen(true)}
                  disabled={reportGenerating || !transcriptText || !hasAiNarrative}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border border-border bg-secondary/15 hover:bg-secondary/25 text-foreground transition-colors disabled:opacity-50"
                  title="Modify the report with custom AI instructions"
                >
                  <MessageSquare className="w-3 h-3" /> Edit
                </button>
                <button
                  type="button"
                  onClick={generateReport}
                  disabled={reportGenerating || !transcriptText}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
                  title="Regenerate report"
                >
                  {reportGenerating
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                    : <><RefreshCw className="w-3 h-3" /> Regenerate</>}
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-6 py-4">
            {(hasAiNarrative) ? (
              <div className="space-y-3">
                {reportGenerating && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/10 border border-secondary/25">
                    <Loader2 className="w-4 h-4 text-secondary animate-spin shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Processing & generating…</p>
                      <p className="text-xs text-muted-foreground">Step 1: Clean → Step 2: Clinical analysis</p>
                    </div>
                  </div>
                )}
                {reportError && (
                  <p className="text-xs font-bold text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">⚠ {reportError}</p>
                )}

                {[
                  { label: "Summary", val: report?.summary || vitals.Summary },
                  { label: "Relevant History", val: report?.relevant_history || vitals.RelevantHistory },
                  { label: "Working Diagnosis", val: report?.diagnosis || vitals.Diagnosis, bold: true },
                  { label: "Clinical Reasoning", val: report?.clinical_reasoning || vitals.ClinicalReasoning },
                ].map(({ label, val, bold }) => (
                  <div key={label} className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                    <p className={`text-sm leading-relaxed ${bold ? "font-semibold" : ""}`}>{safeRender(val)}</p>
                  </div>
                ))}

                {(report?.differential_diagnosis?.length || vitals.DifferentialDiagnosis?.length) ? (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Differential Diagnosis</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {(report?.differential_diagnosis || vitals.DifferentialDiagnosis || []).map((d: any, i: number) => (
                        <li key={i}>{safeRender(d)}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg border ${
                    (report?.risk_level || vitals.RiskLevel) === "high"
                      ? "bg-destructive/10 border-destructive/20 text-foreground"
                      : (report?.risk_level || vitals.RiskLevel) === "medium"
                        ? "bg-tertiary/15 border-tertiary/35 text-foreground"
                        : "bg-quaternary/15 border-quaternary/30 text-foreground"
                  }`}>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Risk Level</p>
                    <p className="text-sm font-extrabold uppercase">{safeRender(report?.risk_level || vitals.RiskLevel)}</p>

                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Alert Focus</p>
                    <p className="text-sm font-semibold">{safeRender(report?.alert_type || vitals.AlertType)}</p>

                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Symptoms</p>
                  {(() => {
                    const s = report?.symptoms ?? vitals.Symptoms;
                    if (Array.isArray(s) && s.length)
                      return <ul className="list-disc list-inside text-sm space-y-1">{s.map((sym: any, i: number) => <li key={i}>{safeRender(sym)}</li>)}</ul>;

                    return <p className="text-sm">N/A</p>;
                  })()}
                </div>

                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Follow-up Plan</p>
                  <p className="text-sm leading-relaxed text-foreground">{safeRender(report?.follow_up_plan || vitals.FollowUpPlan)}</p>

                </div>

                <div className="p-3 rounded-lg bg-tertiary/15 border border-tertiary/35">
                  <p className="text-xs font-bold uppercase tracking-widest text-foreground mb-1">Immediate Action Required</p>
                  <p className="text-sm leading-relaxed text-foreground">{safeRender(report?.action_required || vitals.ActionRequired)}</p>
                </div>

                {/* Follow-up & Appointment schedules */}
                <div className="space-y-3">
                  {(() => {
                    const appt = report?.appointment || vitals.Appointment;
                    if (appt) {
                      return (
                        <div className="p-4 rounded-xl bg-primary/10 border-2 border-primary/20 shadow-sm">
                          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">📅 Clinic Appointment Scheduled</p>
                          <p className="text-base font-extrabold text-foreground">{appt.date}</p>
                          <p className="text-sm font-bold text-primary">🕐 {appt.time}</p>
                          <p className="text-xs text-muted-foreground mt-1">Please arrive 10 minutes early with medication list.</p>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {(() => {
                    const followCall = report?.follow_up_call || vitals.FollowUpCall;
                    if (followCall) {
                      return (
                        <div className="p-4 rounded-xl bg-quaternary/10 border-2 border-quaternary/30 shadow-sm">
                          <p className="text-xs font-bold uppercase tracking-widest text-foreground mb-2">📞 Next AI Follow-up Call</p>
                          <p className="text-base font-extrabold text-foreground">{followCall.date}</p>
                          <p className="text-sm font-bold text-foreground">🕐 {followCall.time}</p>
                          <p className="text-xs text-muted-foreground mt-1">You will receive an automated check-in call directly to your registered phone number.</p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {vitals.ReportPdfPath && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-2">PDF stored: {vitals.ReportPdfPath}</p>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-8">
                <Sparkles className="w-10 h-10 text-secondary" />
                <h3 className="text-base font-heading font-extrabold">No AI Report Yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs">Generate a structured clinical report from the call transcript.</p>
                <button
                  type="button"
                  onClick={generateReport}
                  disabled={reportGenerating || !transcriptText}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border-2 border-secondary/30 bg-secondary/15 hover:bg-secondary/25 text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reportGenerating
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                    : <><Sparkles className="w-4 h-4" /> Generate Report</>}
                </button>
                {!transcriptText && (
                  <p className="text-xs text-muted-foreground">⚠ A transcript is required to generate a report.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── Panel 2: Call Transcript ─── */}
        <div className="bg-card border-2 border-border shadow-soft rounded-xl flex flex-col" style={panelStyle}>
          {/* Sticky header */}
          <div className="shrink-0 px-5 sm:px-6 pt-5 pb-3 border-b-2 border-border border-dashed">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-base sm:text-lg font-heading font-extrabold tracking-tight">Call Transcript</h3>
              <div className="flex items-center gap-2">
                {transcriptSource === "vapi" && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-quaternary/15 text-foreground border border-quaternary/30">
                    <span className="w-2 h-2 rounded-full bg-quaternary animate-pulse inline-block" /> Live · Vapi
                  </span>
                )}
                {transcriptSource === "stored" && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
                    🗄 Stored
                  </span>
                )}
                {vapiCallId && (
                  <button
                    type="button"
                    onClick={() => void fetchLiveTranscript(vapiCallId)}
                    disabled={transcriptLoading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
                    title="Re-fetch transcript from Vapi"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${transcriptLoading ? "animate-spin" : ""}`} />
                    {transcriptLoading ? "Fetching…" : "Refresh"}
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs font-bold text-muted-foreground mt-1.5">
              {transcriptLoading
                ? "Fetching latest transcript from Vapi…"
                : transcriptText
                  ? `${transcriptText.length.toLocaleString()} chars · ${transcriptSource === "vapi" ? "live from Vapi" : "stored record"}`
                  : "No transcript available for this call."}
            </p>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-6 py-4 space-y-4">
            {transcriptLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 opacity-70">
                <RefreshCw className="w-10 h-10 text-muted-foreground animate-spin" />
                <p className="font-bold text-muted-foreground">Fetching live transcript from Vapi…</p>
              </div>
            ) : transcriptText ? (
              transcriptToDisplayBlocks(transcriptText).map((block: string, idx: number) => {
                const isPatient = /^(patient|user|customer)\s*:/i.test(block);
                const isAgent =
                  /^(agent|bot|assistant|ai)\s*:/i.test(block) ||
                  /^assistant:/i.test(block) ||
                  /^system:\s*/i.test(block);
                const cleanText = block.replace(/^(Agent|Patient|User|Bot|Assistant|Customer|System|Tool|Ai)\s*:\s*/i, "");

                if (!isAgent && !isPatient) {
                  return (
                    <p key={idx} className="text-muted-foreground text-center font-bold text-xs my-3 uppercase tracking-widest whitespace-pre-wrap">
                      {block}
                    </p>
                  );
                }

                return (
                  <div key={idx} className={`flex w-full ${isPatient ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[85%] p-4 rounded-2xl border-2 border-border bg-background shadow-soft relative">
                      <div className={`absolute top-4 w-4 h-4 border-2 border-border bg-background rotate-45 ${isPatient ? "-right-2 border-l-0 border-b-0" : "-left-2 border-r-0 border-t-0"}`} />
                      <p className={`text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 ${isPatient ? "text-secondary justify-end" : "text-accent"}`}>
                        {isPatient ? "Patient" : "AI Agent"}
                      </p>
                      <p className="text-foreground text-sm sm:text-base leading-relaxed font-medium whitespace-pre-wrap">{cleanText}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                <div className="w-20 h-20 border-4 border-dashed border-border rounded-full flex items-center justify-center mb-4">
                  <Stethoscope className="w-9 h-9 text-muted-foreground" />
                </div>
                <p className="font-heading font-bold text-xl text-foreground mb-2">Transcript Unavailable</p>
                <p className="text-muted-foreground font-medium text-sm">No conversation text was logged for this session.</p>
                {vapiCallId && (
                  <button
                    type="button"
                    onClick={() => void fetchLiveTranscript(vapiCallId)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border-2 border-border bg-background hover:bg-muted transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" /> Try fetching from Vapi
                  </button>
                )}
              </div>
            )}
          </div>
        </div>


      </div>
    </div>
  );
}
