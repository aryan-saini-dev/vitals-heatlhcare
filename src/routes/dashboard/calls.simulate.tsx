import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../lib/AuthContext";
import { supabase } from "../../lib/supabase";
import { apiUrl } from "../../lib/api";
import { VoiceAssistant } from "../../components/VoiceAssistant";
import {
  Activity,
  AlertTriangle,
  Clipboard,
  Phone,
  Shield,
  User,
  Sparkles,
  ArrowRight,
  Loader2,
  PhoneCall,
  Mic,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/calls/simulate")({
  component: SimulateCall,
});

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
  const [simType, setSimType] = useState<"phone" | "browser">("browser");

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
    callStartedAtRef.current = null;
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
      callStartedAtRef.current = Date.now();
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

  const handleWebCallFinished = (payload: { transcript: string; durationSeconds: number }) => {
    toast.success("Browser check-in call completed. Syncing data...");
    // Direct sync with placeholder Vapi Call ID since it's a browser session
    const mockVapiId = `browser-call-${Date.now()}`;
    void syncCallToDatabase(mockVapiId, payload).then(async (dbId) => {
      if (dbId) {
        // Wait and poll for assessment summary
        const summary = await buildSummaryFromDb({ vapiCallId: mockVapiId });
        if (summary) {
          setSummaryData(summary);
          setRecentDbCallId(dbId);
          setPhase("completed");
        }
      }
    });
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-4 relative">
      {phase === "idle" && (
        <div className="max-w-xl w-full bg-card border border-border/60 p-6 md:p-8 rounded-2xl shadow-card space-y-6 animate-fade-up">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-display font-extrabold tracking-tight">AI Patient Check-in</h1>
            <p className="text-xs text-muted-foreground font-medium">
              Start an interactive voice check-in using your web browser or trigger a phone outbound call.
            </p>
          </div>

          {/* Selector inputs */}
          <div className="space-y-4 max-w-md mx-auto pt-2">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Patient</label>
              <div className="relative">
                <select
                  className="w-full pl-4 pr-10 h-10 rounded-xl border border-border/80 bg-background text-xs font-semibold focus:outline-none focus:border-primary/50 cursor-pointer appearance-none"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.condition ? `(${p.condition})` : ""}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Dial type tabs */}
            <div className="flex bg-secondary/40 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSimType("browser")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  simType === "browser" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
                }`}
              >
                Browser Mic Call
              </button>
              <button
                type="button"
                onClick={() => setSimType("phone")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  simType === "phone" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
                }`}
              >
                Outbound Phone Dial
              </button>
            </div>

            {simType === "phone" && (
              <div className="space-y-1.5 text-left animate-fade-in">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Destination Phone Number</label>
                <div className="flex gap-2">
                  <select
                    className="w-24 px-2 h-10 rounded-xl border border-border/80 bg-background text-xs font-semibold focus:outline-none"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                  >
                    <option value="+1">+1 (US)</option>
                    <option value="+91">+91 (IN)</option>
                  </select>
                  <input
                    type="tel"
                    className="flex-1 px-4 h-10 rounded-xl border border-border/80 bg-background text-xs font-semibold focus:outline-none focus:border-primary/50 placeholder-muted-foreground"
                    placeholder="Phone number"
                    value={callerNumber}
                    onChange={(e) => setCallerNumber(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 max-w-md mx-auto">
            {simType === "browser" ? (
              <VoiceAssistant
                patient={selectedPatient}
                callerPhoneNumber="+1234567890"
                agentId={selectedPatient?.assigned_agent_id}
                onCallFinished={handleWebCallFinished}
              />
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleStartOutboundCall}
                  disabled={!selectedPatient || !destinationNumberE164 || !session || isSaving}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 bg-gradient-primary text-primary-foreground font-bold rounded-xl shadow-glow transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
                >
                  <PhoneCall className="w-4 h-4" /> Start Outbound Phone
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatientId("");
                    setCallerNumber("");
                    setSummaryData(null);
                  }}
                  disabled={isSaving}
                  className="px-5 h-10 bg-secondary text-foreground hover:bg-border/60 border border-border/85 font-bold rounded-xl transition-all"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {isSaving && (
            <p className="text-xs text-muted-foreground text-center font-medium animate-pulse">
              Dialing patient via Vapi Outbound...
            </p>
          )}
          {!isSaving && errorMessage && (
            <p className="text-xs text-destructive text-center font-semibold">{errorMessage}</p>
          )}
        </div>
      )}

      {showPostCallPopup && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border/60 rounded-2xl p-6 shadow-card space-y-4 text-center">
            <h3 className="text-lg font-display font-bold text-foreground">Outbound Check completed</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The phone session has concluded. If the AI summary generation is still compiling, you can view the alerts panel directly.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              {recentDbCallId && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPostCallPopup(false);
                    void navigate({ to: `/dashboard/calls/${recentDbCallId}` });
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-xs shadow-glow hover:scale-[1.02]"
                >
                  Open Call Record
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowPostCallPopup(false);
                  void navigate({
                    to: "/dashboard/alerts",
                  });
                }}
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-border/60 border border-border/80 text-foreground font-bold text-xs"
              >
                Open Alerts
              </button>
              <button
                type="button"
                onClick={() => setShowPostCallPopup(false)}
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-border/60 border border-border/80 text-foreground font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "dialing" && (
        <div className="flex flex-col items-center space-y-6 max-w-xl w-full bg-card border border-border/60 rounded-2xl p-6 shadow-card animate-fade-up">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 shrink-0">
            <Phone className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-display font-extrabold text-foreground">Placing Outbound...</h2>
            <p className="text-xs text-muted-foreground font-medium">Status: {callStatus}</p>
          </div>
          <button
            type="button"
            onClick={handleHangUpOutbound}
            disabled={!vapiCallId}
            className="w-32 h-10 bg-destructive text-destructive-foreground rounded-xl font-bold hover:bg-destructive/90 transition-all text-xs"
          >
            Hang Up
          </button>
          <div className="w-full bg-secondary/30 border border-border/50 rounded-xl p-4 text-left space-y-1.5">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Live Transcription</p>
            <p className="text-xs whitespace-pre-wrap min-h-[56px] text-foreground leading-relaxed">
              {liveTranscript || "Awaiting connection..."}
            </p>
          </div>
        </div>
      )}

      {phase === "completed" && summaryData && (
        <div className="w-full max-w-3xl space-y-6 animate-fade-up">
          <div className="bg-card border border-border/60 rounded-2xl shadow-card overflow-hidden">
            <div className="bg-primary/5 p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0">
                  <Clipboard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-extrabold text-foreground">AI Assessment Summary</h2>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mt-0.5 tracking-wider">
                    {summaryData.alert_type}
                  </p>
                </div>
              </div>
              <div
                className={`px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${
                  summaryData.risk_level === "high"
                    ? "bg-destructive/10 border-destructive/25 text-destructive"
                    : "bg-success/10 border-success/20 text-success"
                }`}
              >
                {summaryData.risk_level} Risk
              </div>
            </div>

            <div className="p-6 space-y-5 text-left text-xs leading-relaxed">
              <div className="p-4 rounded-xl border border-border/60 bg-secondary/25">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Executive Summary
                </p>
                <p className="text-sm font-semibold text-foreground leading-relaxed">{summaryData.summary}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border/60 bg-secondary/25 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Triage Flag</p>
                  <p className="text-xs font-bold text-foreground">{summaryData.alert_type || "N/A"}</p>
                </div>

                <div className="p-4 rounded-xl border border-border/60 bg-secondary/25 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Symptom Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {summaryData.symptoms?.length ? (
                      summaryData.symptoms.map((s: any, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-background border border-border rounded text-[10px] font-medium"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground">No tags</span>
                    )}
                  </div>
                </div>
              </div>

              {(summaryData.diagnosis || summaryData.relevant_history) && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-border/60 bg-secondary/25 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Working Diagnosis
                    </p>
                    <p className="text-xs text-foreground font-bold">{summaryData.diagnosis}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/60 bg-secondary/25 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Prior History</p>
                    <p className="text-xs text-foreground font-medium">{summaryData.relevant_history}</p>
                  </div>
                </div>
              )}

              {summaryData.clinical_reasoning && (
                <div className="p-4 rounded-xl border border-dashed border-border bg-secondary/10">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Clinical Reasoning
                  </p>
                  <p className="text-xs text-foreground font-medium leading-relaxed">{summaryData.clinical_reasoning}</p>
                </div>
              )}

              {summaryData.follow_up_plan && (
                <div className="p-4 rounded-xl border border-primary/15 bg-primary/5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Follow-up Plan</p>
                  <p className="text-xs text-foreground leading-relaxed">{summaryData.follow_up_plan}</p>
                </div>
              )}

              <div className="p-4 bg-destructive/5 border border-destructive/15 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-destructive mb-1">
                  Immediate Recommendation
                </p>
                <p className="text-xs font-bold text-foreground leading-relaxed">{summaryData.action_required}</p>
              </div>
            </div>

            <div className="p-6 bg-secondary/20 border-t border-border/50 flex flex-wrap gap-3">
              {summaryData?.call_db_id && (
                <Link
                  to="/dashboard/calls/$id"
                  params={{ id: summaryData.call_db_id }}
                  className="inline-flex items-center gap-1.5 h-10 px-5 bg-gradient-primary text-primary-foreground font-bold rounded-xl shadow-glow text-xs"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setPhase("idle");
                  setSummaryData(null);
                  setVapiCallId(null);
                }}
                className="px-4 h-10 bg-secondary hover:bg-border/60 border border-border/80 text-foreground font-bold rounded-xl text-xs"
              >
                Place Another Check-in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
