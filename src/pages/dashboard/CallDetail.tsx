import { Link, useParams, useOutletContext } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { apiUrl } from "@/lib/api";
import {
  ArrowLeft, Sparkles, Loader2, MessageSquare,
  RefreshCw, Check, X, Download,
  ChevronDown, ChevronUp, AlertTriangle, Shield, Activity,
  Clock, Mic, MicOff,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

function transcriptToDisplayBlocks(text: string): string[] {
  const raw = (text || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return [];
  if (raw.includes("\n\n")) return raw.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  const lines = raw.split("\n").filter(Boolean);
  const blocks: string[] = [];
  let cur = "";
  const speakerRe = /^(agent|patient|user|bot|assistant|customer|system|tool|ai)\s*:\s*/i;
  for (const line of lines) {
    if (speakerRe.test(line)) { if (cur) blocks.push(cur.trim()); cur = line; }
    else { cur = cur ? `${cur}\n${line}` : line; }
  }
  if (cur.trim()) blocks.push(cur.trim());
  return blocks.length ? blocks : [raw];
}

// Risk-level colour palette mapping to semantic tokens
function getRiskPalette(level: string | undefined) {
  const l = (level || "").toLowerCase();
  if (l === "high" || l === "critical" || l.includes("high")) {
    return {
      bg: "rgba(239,68,68,0.06)",
      border: "rgba(239,68,68,0.18)",
      text: "var(--color-destructive)",
      badgeClass: "bg-destructive/15 text-destructive border border-destructive/20",
      gradient: "linear-gradient(135deg, var(--color-destructive), oklch(0.68 0.19 40))",
      glow: "rgba(239,68,68,0.25)",
      label: "High Risk",
      icon: AlertTriangle
    };
  }
  if (l === "medium" || l === "moderate" || l.includes("needs") || l.includes("attention")) {
    return {
      bg: "rgba(245,158,11,0.06)",
      border: "rgba(245,158,11,0.18)",
      text: "var(--color-warning)",
      badgeClass: "bg-warning/15 text-warning border border-warning/20",
      gradient: "linear-gradient(135deg, var(--color-warning), oklch(0.85 0.15 85))",
      glow: "rgba(245,158,11,0.25)",
      label: "Needs Attention",
      icon: Activity
    };
  }
  return {
    bg: "rgba(16,185,129,0.06)",
    border: "rgba(16,185,129,0.18)",
    text: "var(--color-success)",
    badgeClass: "bg-success/15 text-success border border-success/20",
    gradient: "linear-gradient(135deg, var(--color-success), oklch(0.72 0.16 165))",
    glow: "rgba(16,185,129,0.25)",
    label: "Low Risk / Nominal",
    icon: Shield
  };
}

// High contrast risk styling helper specifically for the brand-colored banner
function getBannerRiskClass(level: string | undefined) {
  const l = (level || "").toLowerCase();
  if (l === "high" || l === "critical" || l.includes("high")) {
    return "bg-rose-500 text-white border border-rose-400/40";
  }
  if (l === "medium" || l === "moderate" || l.includes("needs") || l.includes("attention")) {
    return "bg-amber-500 text-white border border-amber-400/40";
  }
  return "bg-emerald-600 text-white border border-emerald-500/40";
}

export default function CallDetail() {
  const { id } = useParams();
  const { session } = useAuth();
  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [liveTranscript, setLiveTranscript] = useState<string | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptSource, setTranscriptSource] = useState<"vapi" | "stored" | null>(null);

  const [reportGenerating, setReportGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);

  const [waSending, setWaSending] = useState(false);
  const [waStatus, setWaStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const [isListening, setIsListening] = useState(false);
  const windowRecognitionRef = useRef<any>(null);

  // WhatsApp Overrides Modal states
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState("");
  const [customPhone, setCustomPhone] = useState("");

  // Collapsible state for left panel
  const [showDetails, setShowDetails] = useState(false);

  // Layout context hooks to control top header left/right custom elements
  const { setCustomLeftElement, setCustomRightElement } = useOutletContext<any>() || {};

  const loadDetail = async () => {
    if (!id || !session?.access_token) return;
    try {
      const resp = await fetch(apiUrl(`/api/calls/${encodeURIComponent(id)}/detail`), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.call) setCall(data.call);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadDetail(); }, [session, id]);

  const fetchLiveTranscript = async (vapiCallId: string) => {
    if (!vapiCallId) return;
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(vapiCallId)) { setTranscriptSource("stored"); return; }
    setTranscriptLoading(true);
    try {
      const resp = await fetch(apiUrl(`/api/vapi/call/${encodeURIComponent(vapiCallId)}/transcript`));
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const text = String(data.transcript || "").trim();
        if (text && text !== "No transcript found.") { setLiveTranscript(text); setTranscriptSource("vapi"); return; }
      }
    } catch { /* ignore */ }
    finally { setTranscriptLoading(false); }
    setLiveTranscript(null); setTranscriptSource("stored");
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ decision }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || "Failed to update decision");
      setCall((prev: any) => ({ ...prev, vitals_data: { ...(prev.vitals_data || {}), DoctorDecision: decision } }));
      toast.success(`Report ${decision}.`);
    } catch (e: any) { toast.error(e.message || "Decision update failed"); }
  };

  // Top header layout synchronization
  useEffect(() => {
    if (call && setCustomLeftElement && setCustomRightElement) {
      setCustomLeftElement(
        <Link to="/dashboard/calls" className="inline-flex items-center gap-1.5 text-xs font-black text-foreground hover:text-primary transition-all hover:translate-x-[-2px] py-1 cursor-pointer">
          <ArrowLeft className="w-4 h-4 text-primary" /> Back to Calls
        </Link>
      );

      setCustomRightElement(
        <div className="text-right">
          <div className="text-xs font-black text-foreground leading-none">Call #{call.id.substring(0, 8)}</div>
          <div className="text-[9px] text-muted-foreground mt-1 font-bold uppercase tracking-widest flex items-center gap-1.5 justify-end">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Completed Session
          </div>
        </div>
      );
    }

    return () => {
      if (setCustomLeftElement) setCustomLeftElement(null);
      if (setCustomRightElement) setCustomRightElement(null);
    };
  }, [call, setCustomLeftElement, setCustomRightElement]);

  const downloadReport = async () => {
    if (!call || !session?.access_token) return;
    try {
      const resp = await fetch(apiUrl(`/api/calls/${call.id}/report/download`), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!resp.ok) { const d = await resp.json().catch(() => ({})); throw new Error(d?.error || "Download failed"); }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `doctor-prescription-report-${call.id}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF Downloaded.");
    } catch (e: any) { toast.error(e.message || "Download failed"); }
  };

  const sendOnWhatsApp = async (targetPhone: string) => {
    if (!call || !session?.access_token) return;
    setWaSending(true); setWaStatus(null);
    try {
      const resp = await fetch(apiUrl(`/api/calls/${call.id}/report/send-whatsapp`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ phone: targetPhone })
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok) {
        setWaStatus({ type: "success", msg: data?.message || `Report sent to ${targetPhone} via WhatsApp.` });
        toast.success(`WhatsApp message sent to ${targetPhone}.`);
        setIsWaModalOpen(false);
      }
      else {
        setWaStatus({ type: "error", msg: data?.error || "WhatsApp delivery failed." });
        toast.error(data?.error || "WhatsApp delivery failed.");
      }
    } catch (err: any) {
      setWaStatus({ type: "error", msg: err?.message || "Connection error." });
      toast.error(err?.message || "Connection error.");
    }
    finally {
      setWaSending(false);
    }
  };

  const generateReport = async () => {
    if (!call || !session?.access_token) return;
    setReportGenerating(true);
    try {
      const resp = await fetch(apiUrl(`/api/calls/${call.id}/report/generate`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ transcript: liveTranscript || call.transcript || "", prompt: regeneratePrompt || undefined }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || "AI report generation failed");
      setGeneratedReport(data.report);
      setCall((prev: any) => ({ ...prev, vitals_data: { ...(prev.vitals_data || {}), ReportData: data.report } }));
      toast.success("Report generated.");
      setIsRegenerateModalOpen(false); setRegeneratePrompt("");
    } catch (e: any) { toast.error(e.message || "Failed to generate report"); }
    finally { setReportGenerating(false); }
  };

  const toggleListening = () => {
    if (isListening) { if (windowRecognitionRef.current) windowRecognitionRef.current.stop(); setIsListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech Recognition not supported in this browser."); return; }
    const recognition = new SR();
    recognition.continuous = true; recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      let t = "";
      for (let i = event.resultIndex; i < event.results.length; ++i)
        if (event.results[i].isFinal) t += event.results[i][0].transcript;
      if (t) setRegeneratePrompt((prev) => (prev + " " + t.trim()).trim() + " ");
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    windowRecognitionRef.current = recognition;
    setIsListening(true); recognition.start();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2 py-16">
        <div className="w-8 h-8 border-3 border-muted border-t-primary rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Loading call record…</p>
      </div>
    );
  }
  if (!call) {
    return <div className="p-8 text-center text-muted-foreground font-semibold text-xs">Call record not found.</div>;
  }

  const vitals = call.vitals_data || {};
  const report = vitals.ReportData || generatedReport;
  const hasAiNarrative = !!(report?.summary || vitals.Summary);
  const transcriptText = liveTranscript || call.transcript || "";
  const vapiCallId = vitals.VapiCallId;
  const riskLevel = report?.risk_level || vitals.RiskLevel || vitals.Patient_Status || "Low Risk / Nominal";
  const risk = getRiskPalette(riskLevel);
  const RiskIcon = risk.icon;
  const duration = call.duration_seconds
    ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
    : call.duration || "N/A";

  // Key metrics shown always
  const symptoms: string[] = report?.symptoms || vitals.Symptoms || vitals.Symptom_Tags || [];
  const alertType = report?.alert_type || vitals.AlertType || vitals.AI_Diagnosis_Risk || "N/A";
  const diagnosis = report?.diagnosis || vitals.Diagnosis || vitals.AI_Diagnosis_Risk || "N/A";
  const actionRequired = report?.action_required || vitals.ActionRequired || "N/A";

  // Details shown in expanded section
  const summary = report?.summary || vitals.Summary;
  const history = report?.relevant_history || vitals.RelevantHistory;
  const reasoning = report?.clinical_reasoning || vitals.ClinicalReasoning;
  const followUp = report?.follow_up_plan || vitals.FollowUpPlan;
  const differentials: string[] = report?.differential_diagnosis || vitals.DifferentialDiagnosis || [];

  // Predefined Team Members list matching landing page with mockup WhatsApp targets
  const teamDoctors = [
    { name: "Aryan Saini", role: "Doctor #1", phone: "917982404800" },
    { name: "Archee Sinha", role: "Doctor #2", phone: "919958096644" },
    { name: "Aryan Gusain", role: "Doctor #3", phone: "918368312681" },
    { name: "Darshita Gupta", role: "Doctor #4", phone: "919410061061" },
  ];

  const handleWhatsAppSendSubmit = () => {
    const finalPhone = customPhone.trim() || selectedPhone;
    if (!finalPhone) {
      toast.error("Please enter a custom number or select a team member.");
      return;
    }
    // Filter digits
    let cleaned = finalPhone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      cleaned = "91" + cleaned;
    }
    if (!cleaned || cleaned.length < 7) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    void sendOnWhatsApp(cleaned);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto animate-fade-up">

      {/* ── Compact Meta Header Banner — Premium Two-Row Clinic Layout with Brand Gradients ── */}
      <div className="relative rounded-2xl overflow-hidden p-5 shadow-lg space-y-4 border animate-fade-in"
        style={{
          background: "linear-gradient(135deg, var(--color-primary) 0%, oklch(0.60 0.20 250) 100%)",
          borderColor: "rgba(255,255,255,0.1)",
          boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.18)"
        }}
      >
        {/* Row 1: Primary Patient Info and Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center font-display font-black text-white text-sm shadow-inner shrink-0">
              {call.patient_name ? call.patient_name[0].toUpperCase() : "P"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-extrabold text-base text-white leading-none">
                  {call.patient_name}
                </h1>
                {riskLevel && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.75 rounded-full text-[8.5px] font-black uppercase tracking-widest shadow-sm ${getBannerRiskClass(riskLevel)}`}>
                    <RiskIcon className="w-3 h-3" /> {risk.label}
                  </span>
                )}
              </div>
              <p className="text-[9px] text-indigo-100/80 font-bold mt-0.5 tracking-wider uppercase">Patient Record File</p>
            </div>
          </div>

          {/* Action buttons (PDF, AI Analysis, WhatsApp) */}
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => void downloadReport()}
              className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-full font-bold text-xs transition-all hover:scale-105 cursor-pointer bg-white/10 hover:bg-white/20 text-white border border-white/25">
              <Download className="w-3.5 h-3.5 text-indigo-200" /> PDF Report
            </button>
            <button type="button" onClick={() => void generateReport()} disabled={reportGenerating || !transcriptText}
              className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-full font-bold text-xs transition-all hover:scale-105 disabled:opacity-50 cursor-pointer bg-white text-primary border-none shadow-md hover:bg-white/95">
              {reportGenerating ? <><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Analyzing…</> : <><Sparkles className="w-3.5 h-3.5 text-primary" /> AI Analysis</>}
            </button>
            <button type="button" onClick={() => setIsWaModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-full font-bold text-xs transition-all hover:scale-105 cursor-pointer bg-[#25D366] text-white hover:bg-[#20ba5a] border-none shadow-md">
              <MessageSquare className="w-3.5 h-3.5" /> Whatsapp Report
            </button>
          </div>
        </div>

        <div className="border-t border-white/10" />

        {/* Row 2: Secondary Technical Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          <div className="space-y-1">
            <span className="text-[8.5px] font-bold text-indigo-200/90 uppercase tracking-widest block">AI Voice Assistant</span>
            <div className="flex items-center gap-2 text-white font-semibold text-xs">
              <Activity className="w-3.5 h-3.5 text-indigo-200" />
              <span>{call.agent_name || "Care Agent"}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <span className="text-[8.5px] font-bold text-indigo-200/90 uppercase tracking-widest block">Call Duration</span>
            <div className="flex items-center gap-2 text-white font-semibold text-xs">
              <Clock className="w-3.5 h-3.5 text-indigo-200" />
              <span>{duration}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[8.5px] font-bold text-indigo-200/90 uppercase tracking-widest block">Session Date & Time</span>
            <div className="flex items-center gap-2 text-white font-semibold text-xs">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-200" />
              <span className="truncate">{call.created_at
                ? new Date(call.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
                : "N/A"
              }</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[8.5px] font-bold text-indigo-200/90 uppercase tracking-widest block">Session Identifier</span>
            <div className="flex items-center gap-2 text-white font-semibold text-xs">
              <Shield className="w-3.5 h-3.5 text-indigo-200" />
              <span className="font-mono text-[9px] tracking-tight truncate max-w-[130px] text-white/90">{call.id}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── MAIN PANELS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

        {/* ── LEFT: AI Clinical Assessment ── */}
        <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">

          {/* Panel header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-border/70 bg-gradient-to-r from-purple-50/50 to-indigo-50/20">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-xl bg-purple-600/10 text-purple-600 ring-1 ring-purple-600/20">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xs text-foreground">AI Clinical Assessment</h3>
                <p className="text-[8px] text-muted-foreground mt-0.5">Key metrics + expandable details</p>
              </div>
            </div>
            {hasAiNarrative && (
              <button type="button" onClick={() => setIsRegenerateModalOpen(true)}
                disabled={reportGenerating || !transcriptText}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold transition-all hover:scale-105 disabled:opacity-50 cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none shadow-soft hover:brightness-110">
                <MessageSquare className="w-3 h-3" /> Edit
              </button>
            )}
          </div>

          <div className="p-4 space-y-3.5">
            {hasAiNarrative ? (
              <>
                {/* ── ALWAYS-VISIBLE KEY METRICS ── */}

                {/* Risk level hero tile */}
                <div className="p-3.5 rounded-xl border border-border/80"
                  style={{
                    background: riskLevel.toLowerCase().includes("high") || riskLevel.toLowerCase().includes("critical")
                      ? "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(220,38,38,0.03) 100%)"
                      : riskLevel.toLowerCase().includes("needs") || riskLevel.toLowerCase().includes("attention")
                      ? "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(217,119,6,0.03) 100%)"
                      : "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.03) 100%)",
                    borderColor: risk.border
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: risk.gradient, boxShadow: `0 3px 8px ${risk.glow}` }}>
                        <RiskIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Risk Level</p>
                        <p className="text-xs font-black mt-0.5" style={{ color: risk.text }}>{risk.label}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Alert Type</p>
                      <p className="text-[11px] font-bold text-foreground mt-0.5 max-w-[150px] text-right">{alertType}</p>
                    </div>
                  </div>
                </div>

                {/* Diagnosis */}
                <div className="p-3.5 rounded-xl border bg-gradient-to-br from-blue-500/[0.08] to-indigo-600/[0.03] border-blue-200/70">
                  <p className="text-[8px] font-bold uppercase tracking-widest mb-1 text-blue-600">Working Diagnosis</p>
                  <p className="text-xs font-bold text-foreground leading-snug">{diagnosis}</p>
                </div>

                {/* Immediate action */}
                <div className="p-3.5 rounded-xl border"
                  style={{
                    background: riskLevel.toLowerCase().includes("high") || riskLevel.toLowerCase().includes("critical")
                      ? "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(220,38,38,0.03) 100%)"
                      : riskLevel.toLowerCase().includes("needs") || riskLevel.toLowerCase().includes("attention")
                      ? "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(217,119,6,0.03) 100%)"
                      : "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.03) 100%)",
                    borderColor: risk.border
                  }}
                >
                  <p className="text-[8px] font-bold uppercase tracking-widest mb-1" style={{ color: risk.text }}>⚡ Immediate Action</p>
                  <p className="text-[11px] font-bold leading-relaxed text-foreground">{actionRequired}</p>
                </div>

                {/* Symptoms */}
                {symptoms.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-50/50 border border-border/80">
                    <p className="text-[8px] font-bold uppercase tracking-widest mb-2 text-muted-foreground">Symptom Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {symptoms.map((s: string, i: number) => (
                        <span key={i} className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${risk.badgeClass}`}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scheduling cards - always visible */}
                {(vitals.Appointment || vitals.FollowUpCall) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {vitals.Appointment && (
                      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/[0.08] to-teal-600/[0.03] border border-emerald-200/60">
                        <p className="text-[8px] font-bold uppercase tracking-widest mb-1.5 text-emerald-600">📅 Clinic Visit Scheduled</p>
                        <p className="text-xs font-bold text-foreground">{vitals.Appointment.date}</p>
                        <p className="text-[10px] font-bold text-emerald-600 mt-0.5">🕐 {vitals.Appointment.time}</p>
                      </div>
                    )}
                    {vitals.FollowUpCall && (
                      <div className="p-4 rounded-xl bg-gradient-to-br from-sky-500/[0.08] to-blue-600/[0.03] border border-sky-200/60">
                        <p className="text-[8px] font-bold uppercase tracking-widest mb-1.5 text-sky-600">📞 AI Follow-up Scheduled</p>
                        <p className="text-xs font-bold text-foreground">{vitals.FollowUpCall.date}</p>
                        <p className="text-[10px] font-bold text-sky-600 mt-0.5">🕐 {vitals.FollowUpCall.time}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Doctor Decision Approval Section */}
                <div className="pt-2">
                  {!vitals.DoctorDecision ? (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => void setDecision("approved")}
                        className="inline-flex items-center justify-center gap-1.5 h-10 rounded-xl font-bold text-xs transition-all hover:scale-[1.01] cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-soft"
                      >
                        <Check className="w-4 h-4" /> Approve Report
                      </button>
                      <button
                        type="button"
                        onClick={() => void setDecision("denied")}
                        className="inline-flex items-center justify-center gap-1.5 h-10 rounded-xl font-bold text-xs transition-all hover:scale-[1.01] cursor-pointer bg-rose-600 hover:bg-rose-700 text-white shadow-soft"
                      >
                        <X className="w-4 h-4" /> Deny Report
                      </button>
                    </div>
                  ) : (
                    <div className={`p-3 rounded-xl border text-center text-xs font-bold uppercase tracking-wider ${vitals.DoctorDecision === "approved"
                      ? "bg-emerald-500/10 border-emerald-200 text-emerald-700"
                      : "bg-rose-500/10 border-rose-200 text-rose-700"
                      }`}>
                      {vitals.DoctorDecision === "approved" ? "✓ Report Approved" : "✗ Report Denied"}
                    </div>
                  )}
                </div>

                {/* ── EXPAND / COLLAPSE ── */}
                <button type="button" onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:scale-[1.01] cursor-pointer bg-primary/10 text-primary ring-1 ring-primary/15">
                  <span>{showDetails ? "Show Less" : "Show Full Report"}</span>
                  {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {/* ── EXPANDED DETAILS ── */}
                {showDetails && (
                  <div className="space-y-2.5 animate-fade-up">
                    {[
                      { label: "Executive Summary", val: summary, accent: "bg-primary/5 border-primary/10" },
                      { label: "Prior History Context", val: history, accent: "bg-secondary/35 border-border" },
                      { label: "Clinical Decision Logic", val: reasoning, accent: "bg-secondary/35 border-border" },
                      { label: "Follow-up Plan", val: followUp, accent: "bg-success/5 border-success/15" },
                    ].map(({ label, val, accent }) =>
                      val ? (
                        <div key={label} className={`p-3.5 rounded-xl border ${accent}`}>
                          <p className="text-[8px] font-bold uppercase tracking-widest mb-1 text-muted-foreground">{label}</p>
                          <p className="text-xs leading-relaxed text-foreground">{val}</p>
                        </div>
                      ) : null
                    )}

                    {differentials.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-secondary/35 border border-border">
                        <p className="text-[8px] font-bold uppercase tracking-widest mb-1.5 text-muted-foreground">Differential Diagnoses</p>
                        <ul className="space-y-1">
                          {differentials.map((d: string, i: number) => (
                            <li key={i} className="text-xs text-foreground flex items-start gap-2">
                              <span className="w-1.2 h-1.2 rounded-full mt-1.5 shrink-0 animate-pulse" style={{ background: risk.text }} />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="py-10 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 ring-1 ring-primary/15">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xs font-display font-bold text-foreground mb-0.5">No Assessment Yet</h3>
                  <p className="text-[11px] text-muted-foreground max-w-xs">
                    Run <strong>AI Analysis</strong> to analyze the conversation and generate a structured clinical report.
                  </p>
                </div>
                <button type="button" onClick={() => void generateReport()} disabled={reportGenerating || !transcriptText}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2 font-bold rounded-full text-xs cursor-pointer transition-all hover:scale-102 disabled:opacity-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow hover:brightness-110 border-none">
                  {reportGenerating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…</> : <><Sparkles className="w-3.5 h-3.5" /> Run AI Analysis</>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Dialogue Log ── */}
        <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden flex flex-col">

          {/* Panel header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-border/70 bg-gradient-to-r from-blue-50/50 to-cyan-50/20">
            <div className="flex items-center gap-2.5">
              <div className="grid h-7 w-7 place-items-center rounded-xl bg-blue-600/10 text-blue-600 ring-1 ring-blue-600/20">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xs text-foreground">Dialogue Log</h3>
                <p className="text-[8px] text-muted-foreground mt-0.5">Patient ↔ AI Agent conversation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ring-1 ${transcriptSource === "vapi"
                ? "bg-info/10 text-info ring-info/20"
                : "bg-secondary text-muted-foreground ring-border"
                }`}>
                {transcriptSource === "vapi" ? "Vapi Live" : "Archive"}
              </span>
              {vapiCallId && (
                <button type="button" onClick={() => void fetchLiveTranscript(vapiCallId)} disabled={transcriptLoading}
                  className="p-1 rounded-lg border border-border bg-background hover:bg-secondary transition-all hover:scale-105 cursor-pointer">
                  <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${transcriptLoading ? "animate-spin" : ""}`} />
                </button>
              )}
            </div>
          </div>

          {/* Transcript bubbles */}
          <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar bg-secondary/5">
            {transcriptText ? (
              transcriptToDisplayBlocks(transcriptText).map((block, idx) => {
                const isPatient = block.toLowerCase().startsWith("patient:") || block.toLowerCase().startsWith("user:");
                return (
                  <div key={idx} className={`flex ${isPatient ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[78%] rounded-2xl px-4 py-3 text-xs border shadow-sm"
                      style={{
                        background: isPatient ? "#ffffff" : "linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(99, 102, 241, 0.02) 100%)",
                        borderColor: isPatient ? "var(--border)" : "rgba(79, 70, 229, 0.15)",
                        borderLeft: isPatient ? undefined : "4px solid var(--primary)",
                        borderBottomRightRadius: isPatient ? 4 : undefined,
                        borderBottomLeftRadius: !isPatient ? 4 : undefined,
                      }}>
                      <div className={`text-[7.5px] font-extrabold uppercase tracking-widest mb-1.5 ${isPatient ? "text-slate-500" : "text-primary"}`}>
                        {isPatient ? "Patient" : "AI Agent"}
                      </div>
                      <p className="leading-relaxed text-foreground whitespace-pre-wrap font-medium">
                        {block.replace(/^[a-zA-Z\s]+:\s*/, "")}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center">
                <MessageSquare className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-semibold">No transcription logs available.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── WhatsApp Overrides Modal ── */}
      <Dialog open={isWaModalOpen} onOpenChange={setIsWaModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-base">Send Prescription via WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Select a clinical team doctor to share this patient's report, or key in any destination number.
            </p>

            {/* List of Doctor Choices */}
            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
              {teamDoctors.map((doc) => {
                const isSelected = selectedPhone === doc.phone && !customPhone;
                return (
                  <button
                    key={doc.name}
                    type="button"
                    onClick={() => { setSelectedPhone(doc.phone); setCustomPhone(""); }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${isSelected
                      ? "bg-primary/5 border-primary text-foreground"
                      : "bg-background border-border hover:bg-secondary/40"
                      }`}
                  >
                    <div>
                      <p className="font-bold text-foreground">{doc.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{doc.role}</p>
                    </div>
                    <span className="text-[10px] font-bold text-primary">{doc.phone}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-border" />
              <span className="flex-shrink mx-3 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">or Enter Custom Target</span>
              <div className="flex-grow border-t border-border" />
            </div>

            {/* Custom Phone Number input */}
            <div className="space-y-1.5">
              <label htmlFor="custom-phone" className="font-semibold text-muted-foreground">Mobile Phone Number</label>
              <input
                id="custom-phone"
                type="text"
                placeholder="e.g. +91 79824 04800"
                value={customPhone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setCustomPhone(e.target.value); setSelectedPhone(""); }}
                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:border-primary/50"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setIsWaModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleWhatsAppSendSubmit}
              disabled={waSending || (!selectedPhone && !customPhone.trim())}
              className="bg-[#25D366] hover:bg-[#20ba5a] text-white border-none font-bold"
            >
              {waSending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Sending...</> : "Send Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Regenerate Modal ── */}
      <Dialog open={isRegenerateModalOpen} onOpenChange={setIsRegenerateModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display font-bold">Edit Clinical Instructions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-xs text-muted-foreground">
              Provide extra clinical rules or guidelines to direct the AI's diagnosis reasoning.
            </p>
            <div className="relative">
              <Textarea
                className="min-h-[120px] pr-12 text-sm font-medium"
                value={regeneratePrompt}
                onChange={(e) => setRegeneratePrompt(e.target.value)}
                placeholder="e.g. Include recommendation for low-sodium diet and schedule immediate lab appointments."
              />
              <button type="button" onClick={toggleListening}
                className={`absolute right-3 bottom-3 p-2 rounded-full border transition-all cursor-pointer ${isListening ? "animate-pulse" : ""}`}
                style={isListening
                  ? { background: "#ef4444", border: "1px solid #dc2626", color: "#fff" }
                  : { background: "rgba(248,250,252,0.9)", border: "1px solid rgba(0,0,0,0.08)", color: "#94a3b8" }}>
                <Mic className="w-4 h-4" />
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegenerateModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void generateReport()} disabled={reportGenerating}>
              {reportGenerating ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Re-analyzing…</> : "Save & Regenerate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
