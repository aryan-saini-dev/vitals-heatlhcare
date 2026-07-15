import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../lib/AuthContext";
import { apiUrl } from "../../lib/api";
import {
  ArrowLeft,
  Activity,
  Heart,
  FileText,
  Sparkles,
  Loader2,
  MessageSquare,
  RefreshCw,
  Mic,
  MicOff,
  AlertTriangle,
  Check,
  X,
  Download,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/calls/$id")({
  component: CallDetailRoute,
});

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
  const speakerRe = /^(agent|patient|user|bot|assistant|customer|system|tool|ai)\s*:\s*/i;
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

function CallDetailRoute() {
  const { id } = Route.useParams();
  const { session } = useAuth();
  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [liveTranscript, setLiveTranscript] = useState<string | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptSource, setTranscriptSource] = useState<"vapi" | "stored" | null>(null);

  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<any>(null);

  const [waSending, setWaSending] = useState(false);
  const [waStatus, setWaStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const loadDetail = async () => {
    if (!id || !session?.access_token) return;
    try {
      const resp = await fetch(apiUrl(`/api/calls/${encodeURIComponent(id)}/detail`), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.call) {
        setCall(data.call);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
  }, [session, id]);

  const fetchLiveTranscript = async (vapiCallId: string) => {
    if (!vapiCallId) return;
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(vapiCallId)) {
      setTranscriptSource("stored");
      return;
    }

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
    } catch {
      // ignore
    } finally {
      setTranscriptLoading(false);
    }
    setLiveTranscript(null);
    setTranscriptSource("stored");
  };

  useEffect(() => {
    if (!call) return;
    const vapiCallId = String(call.vitals_data?.VapiCallId || "").trim();
    if (vapiCallId) void fetchLiveTranscript(vapiCallId);
    else setTranscriptSource("stored");
  }, [call]);

  const setDecision = async (decision: "approved" | "denied") => {
    if (!call || !session?.access_token) return;
    try {
      const resp = await fetch(apiUrl(`/api/calls/${call.id}/decision`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ decision }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || "Failed to update decision");
      setCall((prev: any) => ({
        ...prev,
        vitals_data: { ...(prev.vitals_data || {}), DoctorDecision: decision },
      }));
      toast.success(`Report ${decision}.`);
    } catch (e: any) {
      toast.error(e.message || "Decision update failed");
    }
  };

  const downloadReport = async () => {
    if (!call || !session?.access_token) return;
    try {
      const resp = await fetch(apiUrl(`/api/calls/${call.id}/report/download`), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || "Download failed");
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `doctor-prescription-report-${call.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF Downloaded.");
    } catch (e: any) {
      toast.error(e.message || "Download failed");
    }
  };

  const sendOnWhatsApp = async () => {
    if (!call || !session?.access_token) return;
    setWaSending(true);
    setWaStatus(null);
    try {
      const resp = await fetch(apiUrl(`/api/calls/${call.id}/report/send-whatsapp`), {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok) {
        setWaStatus({ type: "success", msg: data?.message || "Report sent successfully via WhatsApp." });
        toast.success("WhatsApp message sent.");
      } else {
        setWaStatus({ type: "error", msg: data?.error || "WhatsApp delivery failed." });
        toast.error("WhatsApp delivery failed.");
      }
    } catch (err: any) {
      setWaStatus({ type: "error", msg: err?.message || "Connection error during WhatsApp send." });
    } finally {
      setWaSending(false);
    }
  };

  const generateReport = async () => {
    if (!call || !session?.access_token) return;
    setReportGenerating(true);
    setReportError(null);
    try {
      const transcriptText = liveTranscript || call.transcript || "";
      const resp = await fetch(apiUrl(`/api/calls/${call.id}/report/generate`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          transcript: transcriptText,
          prompt: regeneratePrompt || undefined,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || "AI report generation failed");
      }
      setGeneratedReport(data.report);
      setCall((prev: any) => ({
        ...prev,
        vitals_data: {
          ...(prev.vitals_data || {}),
          ReportData: data.report,
        },
      }));
      toast.success("Report generated by AI successfully.");
      setIsRegenerateModalOpen(false);
      setRegeneratePrompt("");
    } catch (e: any) {
      setReportError(e.message || "AI generation failed");
      toast.error(e.message || "Failed to generate report");
    } finally {
      setReportGenerating(false);
    }
  };

  const toggleListening = () => {
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
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground font-medium text-sm animate-pulse">
        Loading call metrics...
      </div>
    );
  }

  if (!call) {
    return <div className="p-12 text-center text-muted-foreground font-semibold text-sm">Call record not found.</div>;
  }

  const vitals = call.vitals_data || {};
  const report = vitals.ReportData || generatedReport;
  const hasAiNarrative = !!(report?.summary || vitals.Summary);
  const doctorDecision = vitals.DoctorDecision;
  const transcriptText = liveTranscript || call.transcript || "";
  const vapiCallId = vitals.VapiCallId;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-up">
      <Link
        to="/dashboard/calls"
        className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Calls
      </Link>

      {/* Main Metadata Summary Panel */}
      <div className="bg-card border border-border/60 rounded-2xl shadow-card p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-bold text-success uppercase tracking-wider">Completed Session</span>
            </div>
            <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">
              Call #{call.id.substring(0, 8)}
            </h1>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 max-w-3xl">
            {[
              { label: "Patient", val: call.patient_name },
              { label: "Agent", val: call.agent_name || "Care Bot" },
              { label: "Duration", val: call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : call.duration || "N/A" },
              { label: "Decision", val: doctorDecision || "Pending" },
            ].map(({ label, val }) => (
              <div key={label} className="flex flex-col min-w-0">
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">{label}</span>
                <span className="font-bold text-foreground text-sm truncate">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Panel */}
        <div className="mt-5 flex flex-wrap gap-2.5 pt-4 border-t border-border/40 relative z-10">
          {!doctorDecision && (
            <>
              <button
                type="button"
                onClick={() => void setDecision("approved")}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-success/15 hover:bg-success hover:text-success-foreground border border-success/20 rounded-xl font-semibold text-xs text-success transition-all"
              >
                <Check className="w-3.5 h-3.5" /> Approve
              </button>
              <button
                type="button"
                onClick={() => void setDecision("denied")}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 rounded-xl font-semibold text-xs text-destructive transition-all"
              >
                <X className="w-3.5 h-3.5" /> Deny
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void downloadReport()}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-secondary hover:bg-border/60 border border-border/80 rounded-xl font-semibold text-xs text-foreground transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
          <button
            type="button"
            onClick={() => void generateReport()}
            disabled={reportGenerating || !transcriptText}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-primary/10 hover:bg-primary hover:text-primary-foreground border border-primary/20 rounded-xl font-semibold text-xs text-primary transition-all disabled:opacity-50"
          >
            {reportGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Run AI Doctor Analysis
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => void sendOnWhatsApp()}
            disabled={waSending}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-secondary hover:bg-border/60 border border-border/80 rounded-xl font-semibold text-xs text-foreground transition-all disabled:opacity-50"
          >
            {waSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Delivering...
              </>
            ) : (
              <>
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Prescription PDF
              </>
            )}
          </button>
        </div>

        {waStatus && (
          <p
            className={`mt-4 text-xs font-semibold border rounded-xl px-4 py-2.5 max-w-xl ${
              waStatus.type === "success"
                ? "text-success bg-success/10 border-success/20"
                : "text-destructive bg-destructive/10 border-destructive/20"
            }`}
          >
            {waStatus.msg}
          </p>
        )}
      </div>

      {/* Grid panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Panel 1: Clinical AI Report */}
        <div className="bg-card border border-border/60 shadow-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Clinical Assessment
            </h3>
            <div className="flex gap-2">
              {hasAiNarrative && (
                <button
                  type="button"
                  onClick={() => setIsRegenerateModalOpen(true)}
                  disabled={reportGenerating || !transcriptText}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-border/60 border border-border/80 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Edit Report
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {hasAiNarrative ? (
              <div className="space-y-3.5">
                {[
                  { label: "Executive Summary", val: report?.summary || vitals.Summary },
                  { label: "Prior History Context", val: report?.relevant_history || vitals.RelevantHistory },
                  { label: "Working Clinical Diagnosis", val: report?.diagnosis || vitals.Diagnosis, highlight: true },
                  { label: "Clinical Decision Logic", val: report?.clinical_reasoning || vitals.ClinicalReasoning },
                ].map(({ label, val, highlight }) => (
                  <div
                    key={label}
                    className={`p-4 rounded-xl border border-border/60 ${
                      highlight ? "bg-primary/5 border-primary/20" : "bg-secondary/25"
                    }`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      {label}
                    </p>
                    <p className={`text-xs leading-relaxed text-foreground ${highlight ? "font-bold text-sm" : ""}`}>
                      {val || "N/A"}
                    </p>
                  </div>
                ))}

                {(report?.differential_diagnosis?.length || vitals.DifferentialDiagnosis?.length) && (
                  <div className="p-4 rounded-xl border border-border/60 bg-secondary/25">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Differentials
                    </p>
                    <ul className="list-disc list-inside text-xs space-y-1 text-foreground">
                      {(report?.differential_diagnosis || vitals.DifferentialDiagnosis || []).map(
                        (d: any, idx: number) => (
                          <li key={idx}>{d}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-border/60 bg-secondary/25">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Symptom Severity
                    </p>
                    <p className="text-xs font-bold uppercase text-foreground">
                      {report?.risk_level || vitals.RiskLevel || "Unknown"}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/60 bg-secondary/25">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Primary Alert Type
                    </p>
                    <p className="text-xs font-bold text-foreground">
                      {report?.alert_type || vitals.AlertType || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border/60 bg-secondary/25">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Symptom List
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(report?.symptoms || vitals.Symptoms || []).map((s: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-background border border-border/80 rounded-md text-[10px] font-medium text-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-primary/15 bg-primary/5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                    Follow-up Instructions
                  </p>
                  <p className="text-xs leading-relaxed text-foreground">
                    {report?.follow_up_plan || vitals.FollowUpPlan || "N/A"}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-destructive/15 bg-destructive/5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-destructive mb-1">
                    Immediate Action
                  </p>
                  <p className="text-xs leading-relaxed text-foreground">
                    {report?.action_required || vitals.ActionRequired || "N/A"}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-border/40">
                  {vitals.Appointment && (
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                        📅 Clinic Visit Auto-Scheduled
                      </p>
                      <p className="text-sm font-bold text-foreground">{vitals.Appointment.date}</p>
                      <p className="text-xs font-semibold text-primary">🕐 {vitals.Appointment.time}</p>
                    </div>
                  )}
                  {vitals.FollowUpCall && (
                    <div className="p-4 bg-info/10 border border-info/20 rounded-xl">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-info mb-1">
                        📞 AI Follow-up Check-in Auto-Scheduled
                      </p>
                      <p className="text-sm font-bold text-foreground">{vitals.FollowUpCall.date}</p>
                      <p className="text-xs font-semibold text-info">🕐 {vitals.FollowUpCall.time}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 space-y-4">
                <Sparkles className="w-10 h-10 text-muted-foreground/60 mx-auto" />
                <h3 className="text-sm font-display font-bold text-foreground">No Assessment Generated</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Run the AI Doctor Analysis to clean, analyze, and format the conversation logs.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Transcript */}
        <div className="bg-card border border-border/60 shadow-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <h3 className="font-display font-bold text-base text-foreground">Dialogue Log</h3>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-secondary border border-border text-muted-foreground">
                {transcriptSource === "vapi" ? "Vapi Live" : "Archive"}
              </span>
              {vapiCallId && (
                <button
                  type="button"
                  onClick={() => void fetchLiveTranscript(vapiCallId)}
                  disabled={transcriptLoading}
                  className="p-1 rounded-lg border border-border bg-background hover:bg-secondary transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${transcriptLoading ? "animate-spin" : ""}`} />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
            {transcriptText ? (
              transcriptToDisplayBlocks(transcriptText).map((block, idx) => {
                const isPatient = block.toLowerCase().startsWith("patient:") || block.toLowerCase().startsWith("user:");
                return (
                  <div key={idx} className={`flex ${isPatient ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-soft ${
                        isPatient
                          ? "bg-secondary text-foreground rounded-tr-sm border border-border"
                          : "bg-primary/5 text-foreground rounded-tl-sm border border-primary/15"
                      }`}
                    >
                      <div
                        className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${
                          isPatient ? "text-muted-foreground" : "text-primary"
                        }`}
                      >
                        {isPatient ? "Patient" : "AI Agent"}
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{block.replace(/^[a-zA-Z\s]+:\s*/, "")}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground text-center py-12">No transcription logs available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Report Regeneration Prompt Modal */}
      <Dialog open={isRegenerateModalOpen} onOpenChange={setIsRegenerateModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display font-bold">Edit Clinical Instructions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-xs text-muted-foreground">
              Provide extra clinical rules or guidelines to direct the AI's diagnosis reasoning (e.g., dosage limits, patient instructions).
            </p>
            <div className="relative">
              <Textarea
                className="min-h-[120px] pr-12 text-sm font-medium"
                value={regeneratePrompt}
                onChange={(e) => setRegeneratePrompt(e.target.value)}
                placeholder="e.g. Include recommendation for low-sodium diet and schedule immediate lab appointments."
              />
              <button
                type="button"
                onClick={toggleListening}
                className={`absolute right-3 bottom-3 p-2 rounded-full border transition-all ${
                  isListening
                    ? "bg-destructive text-destructive-foreground border-destructive animate-pulse"
                    : "bg-secondary hover:bg-border text-muted-foreground border-border"
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegenerateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void generateReport()} disabled={reportGenerating}>
              {reportGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Re-analyzing...
                </>
              ) : (
                "Save & Regenerate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
