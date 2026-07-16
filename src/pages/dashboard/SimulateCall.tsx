import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/api";
import {
  Clipboard,
  Phone,
  PhoneCall,
  ArrowRight,
  Sparkles,
  Bot,
  CheckCircle2,
  Volume2,
  User,
} from "lucide-react";
import { toast } from "sonner";

type CallPhase = "idle" | "dialing" | "completed";

export default function SimulateCall() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [callerNumber, setCallerNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [summaryData, setSummaryData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [vapiCallId, setVapiCallId] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [callStatus, setCallStatus] = useState<string>("idle");
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showPostCallPopup, setShowPostCallPopup] = useState(false);
  const [recentCallId, setRecentCallId] = useState<string | null>(null);
  const [recentDbCallId, setRecentDbCallId] = useState<string | null>(null);

  // Tab selection state: "web" (interactive web demo) or "telephony" (outbound direct dial)
  const [activeTab, setActiveTab] = useState<"web" | "telephony">("web");

  const pollTimerRef = useRef<number | null>(null);
  const statusPollRef = useRef<number | null>(null);
  const lastEndedReasonRef = useRef<string | null>(null);
  const summaryDoneRef = useRef(false);
  const pollCountRef = useRef(0);
  const transcriptRef = useRef("");
  const callStartedAtRef = useRef<number | null>(null);

  function clientElapsedSeconds(): number | undefined {
    const t0 = callStartedAtRef.current;
    if (t0 == null) return undefined;
    return Math.max(0, Math.round((Date.now() - t0) / 1000));
  }

  function pushDebug(line: string) {
    const stamp = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [...prev.slice(-39), `[${stamp}] ${line}`]);
  }

  useEffect(() => {
    async function fetchPatients() {
      if (!user) return;
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("docuuid", user.id)
        .order("created_at", { ascending: false });
      if (error) return;
      if (data) {
        setPatients(data);
        if (data.length > 0) {
          setSelectedPatientId(data[0].id);
        }
      }
    }
    void fetchPatients();
  }, [user]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || null;

  const destinationNumberE164 = useMemo(() => {
    const digits = String(callerNumber || "").replace(/\D/g, "");
    return digits ? `${countryCode}${digits}` : "";
  }, [callerNumber, countryCode]);

  async function syncCallToDatabase(
    vapiId: string | null,
    opts?: { transcript?: string; durationSeconds?: number }
  ): Promise<string | null> {
    if (!session || !vapiId) return null;
    try {
      const transcript = String(opts?.transcript ?? transcriptRef.current ?? "").trim();
      const durationSeconds = opts?.durationSeconds ?? clientElapsedSeconds();
      const body: Record<string, unknown> = { vapiCallId: vapiId };
      if (transcript) body.transcript = transcript;
      if (durationSeconds != null && durationSeconds > 0) body.durationSeconds = durationSeconds;

      const resp = await fetch(apiUrl("/api/vapi/sync-call"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        pushDebug(`Sync to DB failed: ${data?.error || resp.status}`);
        toast.error(data?.error || "Could not save call - check server API.");
        return null;
      }
      if (data.duplicated) pushDebug("Sync: call already stored in database.");
      else pushDebug(`Sync: call saved with id ${data.callId}`);
      const dbId = typeof data.callId === "string" ? data.callId : null;
      if (dbId) {
        setRecentDbCallId(dbId);
        window.dispatchEvent(new Event("vitals:invalidate-lists"));
        toast.success("Call details synchronized successfully.");
      }
      return dbId;
    } catch (e) {
      pushDebug(`Sync error: ${e instanceof Error ? e.message : "unknown"}`);
      return null;
    }
  }

  async function buildSummaryFromDb(opts?: { sinceMs?: number; vapiCallId?: string | null }) {
    if (!session || !selectedPatient) return null;
    const sinceMs = opts?.sinceMs;
    const vapiCallId = opts?.vapiCallId || "";
    const qs = new URLSearchParams({ patientId: selectedPatient.id });
    if (vapiCallId) qs.set("vapiCallId", vapiCallId);

    const listResp = await fetch(apiUrl(`/api/calls/list?${qs.toString()}`), {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const listPayload = await listResp.json().catch(() => ({}));
    if (!listResp.ok || !Array.isArray(listPayload.calls) || !listPayload.calls[0]) return null;
    const call = listPayload.calls[0];

    if (sinceMs != null) {
      const slackMs = 20_000;
      const callTs = call.created_at ? new Date(call.created_at).getTime() : 0;
      if (!callTs || callTs < sinceMs - slackMs) return null;
    }

    const rd = call.vitals_data?.ReportData as Record<string, any> | undefined;
    const vitals = (call.vitals_data || {}) as Record<string, any>;
    const severity = String(rd?.risk_level || vitals.RiskLevel || "medium");
    const alert_type = String(rd?.alert_type || vitals.AlertType || "");
    const symptomsRaw = vitals.Symptoms ?? rd?.symptoms;
    const symptoms = Array.isArray(symptomsRaw) ? symptomsRaw.map(String) : [];

    const vitalsOnly = Object.fromEntries(
      Object.entries(vitals).filter(
        ([k]) =>
          ![
            "Symptoms",
            "Summary",
            "Diagnosis",
            "ActionRequired",
            "RelevantHistory",
            "ClinicalReasoning",
            "DifferentialDiagnosis",
            "FollowUpPlan",
            "ReportData",
            "PatientName",
            "PatientCondition",
            "PatientAge",
            "VapiCallId",
            "ReportPdfPath",
            "PdfStoredInStorage",
            "PdfStorageError",
            "PdfGenerationError",
            "PdfGeneratedAt",
            "DoctorDecision",
            "DoctorDecisionAt",
            "DoctorEmail",
            "CallTranscript",
          ].includes(k)
      )
    );

    const differentials = Array.isArray(vitals.DifferentialDiagnosis)
      ? vitals.DifferentialDiagnosis.map(String)
      : Array.isArray(rd?.differential_diagnosis)
        ? rd.differential_diagnosis.map(String)
        : [];

    return {
      call_db_id: String(call.id),
      summary: String(vitals.Summary || rd?.summary || ""),
      risk_level: severity,
      alert_type,
      symptoms,
      vitals_data: vitalsOnly,
      action_required: String(vitals.ActionRequired || rd?.action_required || ""),
      diagnosis: String(vitals.Diagnosis || rd?.diagnosis || ""),
      relevant_history: String(vitals.RelevantHistory || rd?.relevant_history || ""),
      clinical_reasoning: String(vitals.ClinicalReasoning || rd?.clinical_reasoning || ""),
      differential_diagnosis: differentials,
      follow_up_plan: String(vitals.FollowUpPlan || rd?.follow_up_plan || ""),
    };
  }

  async function handleStartOutboundCall() {
    if (!user || !session || !selectedPatient || !destinationNumberE164) return;
    setIsSaving(true);
    setSummaryData(null);
    setErrorMessage("");
    setPhase("dialing");
    setVapiCallId(null);
    setLiveTranscript("");
    setCallStatus("dialing");
    setDebugLogs([]);
    lastEndedReasonRef.current = null;
    summaryDoneRef.current = false;
    pollCountRef.current = 0;
    setRecentDbCallId(null);
    transcriptRef.current = "";
    callStartedAtRef.current = Date.now();
    pushDebug("Starting outbound call request");

    let createdCallId: string | null = null;
    try {
      const resp = await fetch(apiUrl("/api/vapi/outbound-call"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          destinationNumber: destinationNumberE164,
          callerNumber: destinationNumberE164,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Outbound call start failed");
      createdCallId = data.vapiCallId || null;
      setVapiCallId(createdCallId);
      setRecentCallId(createdCallId);
      pushDebug(`Outbound call created: ${data.vapiCallId || "unknown"}`);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Could not start outbound call.");
      setIsSaving(false);
      setPhase("idle");
      return;
    }

    if (statusPollRef.current) window.clearInterval(statusPollRef.current);
    statusPollRef.current = window.setInterval(async () => {
      if (!createdCallId) return;
      try {
        const resp = await fetch(apiUrl(`/api/vapi/call/${createdCallId}`));
        const data = await resp.json();
        if (!resp.ok) {
          pushDebug(`Status poll error: ${data?.error || "unknown"}`);
          return;
        }
        setCallStatus(String(data?.status || "unknown"));

        let nextTranscript = "";
        if (typeof data?.transcript === "string" && data.transcript.trim()) {
          nextTranscript = data.transcript.trim();
        } else if (Array.isArray(data?.messages) && data.messages.length > 0) {
          nextTranscript = data.messages
            .map((m: any) => {
              const role = (m.role || m.type || "unknown").toString().toLowerCase();
              const c = m.content ?? m.message;
              let text = "";
              if (typeof c === "string") text = c.trim();
              else if (Array.isArray(c))
                text = c
                  .map((p: any) => (typeof p === "string" ? p : p?.text || ""))
                  .join(" ")
                  .trim();
              if (!text) return "";
              return `${role}: ${text}`;
            })
            .filter(Boolean)
            .join("\n");
        }
        if (nextTranscript) {
          setLiveTranscript(nextTranscript);
          transcriptRef.current = nextTranscript;
        }
        const endedReason = data?.endedReason ? String(data.endedReason) : null;
        if (endedReason && endedReason !== lastEndedReasonRef.current) {
          lastEndedReasonRef.current = endedReason;
          pushDebug(`Call ended reason: ${endedReason}`);
        }
        if (data?.status === "ended") {
          void syncCallToDatabase(createdCallId, {
            transcript: transcriptRef.current,
            durationSeconds: clientElapsedSeconds(),
          });
          setIsSaving(false);
          setErrorMessage(endedReason ? `Call ended: ${endedReason}` : "Call ended.");
          if (statusPollRef.current) {
            window.clearInterval(statusPollRef.current);
            statusPollRef.current = null;
          }
        }
      } catch (err) {
        pushDebug(`Status poll failed: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }, 2000);

    const startedAt = Date.now();
    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    pollTimerRef.current = window.setInterval(async () => {
      if (summaryDoneRef.current) return;
      pollCountRef.current += 1;
      if (pollCountRef.current > 100) {
        if (pollTimerRef.current) {
          window.clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        setIsSaving(false);
        return;
      }
      const summaryFromDb = await buildSummaryFromDb({
        sinceMs: startedAt,
        vapiCallId: createdCallId,
      });
      if (!summaryFromDb) return;
      summaryDoneRef.current = true;
      setSummaryData(summaryFromDb);
      setIsSaving(false);
      setPhase("completed");
      setRecentDbCallId(summaryFromDb.call_db_id);
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (statusPollRef.current) {
        window.clearInterval(statusPollRef.current);
        statusPollRef.current = null;
      }
    }, 2500);
  }

  async function handleHangUpOutbound() {
    if (!session || !vapiCallId) return;
    try {
      const resp = await fetch(apiUrl(`/api/vapi/outbound-call/${vapiCallId}/hangup`), {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setErrorMessage(data?.error || "Hangup failed");
        return;
      }
      summaryDoneRef.current = false;
      pollCountRef.current = 0;
      const hangupT0 = Date.now();
      void syncCallToDatabase(vapiCallId, {
        transcript: transcriptRef.current,
        durationSeconds: clientElapsedSeconds(),
      });
      if (statusPollRef.current) {
        window.clearInterval(statusPollRef.current);
        statusPollRef.current = null;
      }
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = window.setInterval(async () => {
        if (summaryDoneRef.current) return;
        pollCountRef.current += 1;
        if (pollCountRef.current > 80) {
          if (pollTimerRef.current) {
            window.clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          setShowPostCallPopup(true);
          return;
        }
        const s = await buildSummaryFromDb({ sinceMs: hangupT0 - 25_000, vapiCallId });
        if (!s) return;
        summaryDoneRef.current = true;
        setSummaryData(s);
        setRecentDbCallId(s.call_db_id);
        setPhase("completed");
        window.dispatchEvent(new Event("vitals:invalidate-lists"));
        toast.success("Call analysis ready.");
        if (pollTimerRef.current) {
          window.clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }, 2500);
      setCallStatus("ended");
      setIsSaving(false);
      setPhase("idle");
      setShowPostCallPopup(false);
    } catch (e: any) {
      setErrorMessage(e?.message || "Hangup failed");
    }
  }

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
      if (statusPollRef.current) window.clearInterval(statusPollRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-2 relative max-w-4xl mx-auto">
      {phase === "idle" && (
        <div className="w-full space-y-4 animate-fade-up">

          {/* Segmented Tab Controller */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-full bg-secondary/50 p-1 border border-border max-w-md w-full">
              <button
                type="button"
                onClick={() => setActiveTab("web")}
                className={`flex-1 py-2 px-4 rounded-full text-xs font-bold transition-all ${
                  activeTab === "web"
                    ? "bg-primary text-white shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Web Browser Agent
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("telephony")}
                className={`flex-1 py-2 px-4 rounded-full text-xs font-bold transition-all ${
                  activeTab === "telephony"
                    ? "bg-primary text-white shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Outbound Phone Call
              </button>
            </div>
          </div>

          {/* ── Tab Content: Web Agent ── */}
          {activeTab === "web" && (
            <div className="bg-card border border-border p-5 rounded-2xl shadow-card relative overflow-hidden flex flex-col justify-between max-w-xl mx-auto w-full">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Bot className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-sm font-display font-extrabold text-foreground">AI Clinical Voice Agent</h2>
                    <p className="text-[9px] font-bold text-primary uppercase tracking-wider">Interactive Web Demo</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Test custom RAG-grounded clinician check-ins directly inside your browser. No phone line required.
                </p>

                {/* Animated waves container */}
                <div className="h-12 bg-secondary/30 rounded-xl flex items-center justify-center gap-1 border border-border/40 px-6">
                  {[6, 16, 24, 12, 32, 20, 8, 18, 10, 28, 14, 8].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 rounded-full bg-primary/45"
                      style={{
                        height: `${h}px`,
                        animation: `float 1.${i % 5}s ease-in-out infinite alternate`,
                      }}
                    />
                  ))}
                </div>

                <div className="space-y-2">
                  {[
                    "Supports real-time multilingual symptoms intake.",
                    "Auto-triages clinical risk into the doctor's database.",
                  ].map((text, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-foreground font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 space-y-3">
                <a
                  href="https://vapi.ai?demo=true&shareKey=ae8a872f-9bd6-43b3-bd91-5a4f9ce900fd&assistantId=36c1a453-9532-419c-93f3-1cdb4bf80413"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full h-11 bg-gradient-primary text-white font-bold rounded-xl shadow-glow transition-all hover:scale-105 cursor-pointer text-xs"
                >
                  <Volume2 className="w-4 h-4" /> Launch Browser Demo Call <ArrowRight className="w-3.5 h-3.5" />
                </a>
                <p className="text-[9px] text-muted-foreground text-center">
                  Clinician Portal prompt: act as patient <strong>Anita</strong> to test clinical diagnostic flags.
                </p>
              </div>
            </div>
          )}

          {/* ── Tab Content: Telephony Outbound ── */}
          {activeTab === "telephony" && (
            <div className="bg-card border border-border p-5 rounded-2xl shadow-card relative overflow-hidden max-w-xl mx-auto w-full">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <PhoneCall className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-display font-extrabold text-foreground">Outbound Direct Dial</h2>
                    <p className="text-[9px] font-bold text-primary uppercase tracking-wider">Telephony Test</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Call any registered patient's physical phone number. The agent automatically reviews historical symptoms to dial.
                </p>

                <div className="space-y-3">
                  {/* Interactive Patient Dropdown context */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Select Patient Context</label>
                    <select
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-primary/50"
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                    >
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.condition ? `(${p.condition})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Phone input */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                    <div className="flex gap-2">
                      <select
                        className="w-24 px-2 h-10 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                      >
                        <option value="+1">+1 (US)</option>
                        <option value="+91">+91 (IN)</option>
                      </select>
                      <input
                        type="tel"
                        className="flex-1 px-3 h-10 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-primary/50 placeholder-muted-foreground"
                        placeholder="e.g. 5550199"
                        value={callerNumber}
                        onChange={(e) => setCallerNumber(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Compact Sandbox scope description */}
                <div className="p-3 bg-warning/5 border border-warning/15 rounded-xl text-left flex gap-2">
                  <div className="w-4 h-4 bg-warning/10 text-warning rounded flex items-center justify-center shrink-0 font-bold text-[10px]">
                    !
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold uppercase text-warning tracking-wider">Twilio Calling Scope</p>
                    <p className="text-[9px] text-muted-foreground leading-normal font-medium">
                      Dialing only works for numbers registered manually in Twilio. Non-US numbers (+91 etc.) are restricted on free accounts.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-6">
                <button
                  type="button"
                  onClick={handleStartOutboundCall}
                  disabled={!selectedPatient || !destinationNumberE164 || !session || isSaving}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 bg-gradient-primary text-white font-bold rounded-xl shadow-glow transition-all hover:scale-[1.02] disabled:opacity-50 cursor-pointer text-xs"
                >
                  <Phone className="w-4 h-4" /> Start Outbound Phone
                </button>
                <button
                  type="button"
                  onClick={() => { setCallerNumber(""); setSummaryData(null); }}
                  disabled={isSaving}
                  className="px-4 h-11 bg-secondary text-foreground hover:bg-border/60 border border-border font-semibold rounded-xl text-xs transition-all"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Dialing Phase ── */}
      {phase === "dialing" && (
        <div className="max-w-xl w-full mx-auto bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col items-center space-y-4 animate-fade-up relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-75"></div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 shrink-0 relative z-10">
              <Phone className="w-6 h-6 text-primary animate-pulse" />
            </div>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-base font-display font-extrabold text-foreground tracking-tight">Active Check-in Call</h2>
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Status: {callStatus}</p>
            </div>
          </div>

          <div className="w-full bg-secondary/35 border border-border/70 rounded-xl p-4 text-left space-y-1.5">
            <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Live Transcription Feed</p>
            <div className="h-40 overflow-y-auto pr-1">
              <p className="text-xs whitespace-pre-wrap font-mono text-foreground leading-relaxed font-semibold">
                {liveTranscript || "Connecting and waiting for agent dialogue..."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleHangUpOutbound}
            disabled={!vapiCallId}
            className="w-full sm:w-44 h-10 bg-destructive text-white rounded-xl font-bold hover:bg-destructive/90 transition-all text-xs cursor-pointer shadow shadow-destructive/20"
          >
            End Check-in Call
          </button>
        </div>
      )}

      {/* ── Summary Results Phase ── */}
      {phase === "completed" && summaryData && (
        <div className="w-full max-w-3xl mx-auto space-y-4 animate-fade-up">
          <div className="bg-card border border-border shadow-card rounded-2xl overflow-hidden">
            <div className="bg-primary/5 p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0">
                  <Clipboard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-display font-extrabold text-foreground">AI Assessment Summary</h2>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5 tracking-wider">
                    {summaryData.alert_type || "General Check-in"}
                  </p>
                </div>
              </div>
              <div
                className={`px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                  summaryData.risk_level === "high"
                    ? "bg-destructive/10 border-destructive/25 text-destructive"
                    : "bg-success/10 border-success/20 text-success"
                }`}
              >
                {summaryData.risk_level} Risk
              </div>
            </div>

            <div className="p-5 space-y-4 text-left text-xs leading-relaxed">
              <div className="p-4 rounded-xl border border-border bg-secondary/20">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Executive Summary
                </p>
                <p className="text-xs font-semibold text-foreground leading-relaxed">{summaryData.summary}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Triage Status</p>
                  <p className="text-xs font-bold text-foreground">{summaryData.alert_type || "N/A"}</p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Symptom Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {summaryData.symptoms?.length ? (
                      summaryData.symptoms.map((s: any, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-background border border-border rounded-md text-[9px] font-bold"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground">No symptoms flagged</span>
                    )}
                  </div>
                </div>
              </div>

              {(summaryData.diagnosis || summaryData.relevant_history) && (
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Working Diagnosis</p>
                    <p className="text-xs text-foreground font-bold">{summaryData.diagnosis}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Prior History</p>
                    <p className="text-xs text-foreground font-medium">{summaryData.relevant_history}</p>
                  </div>
                </div>
              )}

              {summaryData.clinical_reasoning && (
                <div className="p-4 rounded-xl border border-dashed border-border bg-secondary/10 space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Clinical Reasoning</p>
                  <p className="text-xs text-foreground font-medium leading-relaxed">{summaryData.clinical_reasoning}</p>
                </div>
              )}

              {summaryData.follow_up_plan && (
                <div className="p-4 rounded-xl border border-primary/15 bg-primary/5 space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-primary">Follow-up Plan</p>
                  <p className="text-xs text-foreground font-semibold leading-relaxed">{summaryData.follow_up_plan}</p>
                </div>
              )}

              <div className="p-4 bg-destructive/5 border border-destructive/15 rounded-xl space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-destructive">Immediate Action</p>
                <p className="text-xs font-bold text-foreground leading-relaxed">{summaryData.action_required}</p>
              </div>
            </div>

            <div className="p-4 bg-secondary/15 border-t border-border flex flex-wrap gap-2.5 text-xs">
              {summaryData?.call_db_id && (
                <Link
                  to={`/dashboard/calls/${summaryData.call_db_id}`}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-gradient-primary text-white font-bold rounded-xl shadow-glow text-[11px] cursor-pointer transition-all hover:scale-105"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setPhase("idle");
                  setSummaryData(null);
                  setVapiCallId(null);
                }}
                className="px-4 py-2 bg-secondary hover:bg-border/60 border border-border text-foreground font-bold rounded-xl text-[11px] cursor-pointer"
              >
                Dial Another Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
