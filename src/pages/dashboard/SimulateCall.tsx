import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Activity, AlertTriangle, Clipboard, Phone, Shield, User } from "lucide-react";
import type { PatientInfo } from "@/components/VoiceAssistant";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "@/lib/api";
import { toast } from "sonner";
import { safeRender } from "@/lib/renderUtils";


const LISTS_INVALIDATE = "vitals:invalidate-lists";

type CallPhase = "idle" | "dialing" | "completed";

export default function SimulateCall() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [patients, setPatients] = useState<PatientInfo[]>([]);
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
  const pollTimerRef = useRef<number | null>(null);
  const statusPollRef = useRef<number | null>(null);
  const lastEndedReasonRef = useRef<string | null>(null);
  const summaryDoneRef = useRef(false);
  const pollCountRef = useRef(0);
  /** Live transcript/duration fallback when Vapi GET omits fields (sync sends these to the API). */
  const transcriptRef = useRef("");
  const callStartedAtRef = useRef<number | null>(null);

  function clientElapsedSeconds(): number | undefined {
    const t0 = callStartedAtRef.current;
    if (t0 == null) return undefined;
    return Math.max(0, Math.round((Date.now() - t0) / 1000));
  }

  async function syncCallToDatabase(
    vapiId: string | null,
    opts?: { transcript?: string; durationSeconds?: number },
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
        toast.error(data?.error || "Could not save call — check API logs (Gemini / Supabase).");
        return null;
      }
      if (data.duplicated) pushDebug("Sync: call already in database (webhook or prior sync).");
      else pushDebug(`Sync: stored call in database id ${data.callId || "ok"}`);
      const dbId = typeof data.callId === "string" ? data.callId : null;
      if (dbId) {
        setRecentDbCallId(dbId);
        window.dispatchEvent(new CustomEvent(LISTS_INVALIDATE));
        toast.success("Call saved. Alerts and call log will refresh.");
      }
      return dbId;
    } catch (e) {
      pushDebug(`Sync error: ${e instanceof Error ? e.message : "unknown"}`);
      toast.error("Sync request failed — is the API running?");
      return null;
    }
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
        setPatients(
          data.map((p: any) => ({
            id: p.id,
            name: p.name,
            condition: p.condition,
            age: p.age,
            risk_level: p.risk_level,
            assigned_agent_id: p.assigned_agent_id,
            date_of_birth: p.date_of_birth,
          })),
        );
      }
    }
    fetchPatients();
  }, [user]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || null;
  const destinationNumberE164 = useMemo(() => {
    const digits = String(callerNumber || "").replace(/\D/g, "");
    return digits ? `${countryCode}${digits}` : "";
  }, [callerNumber, countryCode]);

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
          ].includes(k),
      ),
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
      console.log("[UI] vapiCallId:", data.vapiCallId);
      pushDebug(`Outbound call created: ${data.vapiCallId || "unknown id"}`);
    } catch (e) {
      console.error("[UI] outbound start error:", e);
      setErrorMessage(e instanceof Error ? e.message : "Could not start outbound call.");
      pushDebug(`Outbound start error: ${e instanceof Error ? e.message : "unknown"}`);
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
          pushDebug(`Status poll error: ${data?.error || "unknown error"}`);
          return;
        }
        setCallStatus(String(data?.status || "unknown"));

        let nextTranscript = "";
        if (typeof data?.transcript === "string" && data.transcript.trim()) {
          nextTranscript = data.transcript.trim();
        } else if (Array.isArray(data?.messages) && data.messages.length > 0) {
          nextTranscript = data.messages
            .map((m: { role?: string; type?: string; content?: unknown; message?: unknown }) => {
              const role = (m.role || m.type || "unknown").toString().toLowerCase();
              const c = m.content ?? m.message;
              let text = "";
              if (typeof c === "string") text = c.trim();
              else if (Array.isArray(c))
                text = c
                  .map((p: unknown) =>
                    typeof p === "string" ? p : (p as { text?: string })?.text || "",
                  )
                  .join(" ")
                  .trim();
              else if (c && typeof c === "object" && c !== null && "text" in (c as object))
                text = String((c as { text?: string }).text || "").trim();
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
          /* Keep pollTimerRef running until buildSummaryFromDb succeeds (sync + Gemini are async). */
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
        pushDebug("Timeout waiting for DB row — check API: sync-call, Gemini key, Supabase calls table");
        toast.error("Timed out waiting for AI summary. Check debug logs and server console.");
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
      pushDebug("Summary detected in DB, call flow completed");
      window.dispatchEvent(new CustomEvent(LISTS_INVALIDATE));
      toast.success("Clinical summary ready — check Call Logs and Alerts.");
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
    pushDebug(`Hangup requested for call ${vapiCallId}`);
    try {
      const resp = await fetch(apiUrl(`/api/vapi/outbound-call/${vapiCallId}/hangup`), {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg = data?.error || "Hangup failed";
        setErrorMessage(msg);
        pushDebug(`Hangup failed: ${msg}`);
        return;
      }
      pushDebug("Hangup succeeded");
      summaryDoneRef.current = false;
      pollCountRef.current = 0;
      const hangupT0 = Date.now();
      await syncCallToDatabase(vapiCallId, {
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
        window.dispatchEvent(new CustomEvent(LISTS_INVALIDATE));
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Hangup failed";
      setErrorMessage(msg);
      pushDebug(`Hangup exception: ${msg}`);
    }
  }

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
      if (statusPollRef.current) window.clearInterval(statusPollRef.current);
    };
  }, []);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 md:p-8 relative">
      <div className="fixed inset-0 overflow-hidden -z-10 opacity-30 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </div>

      {phase === "idle" && (
        <div className="max-w-3xl w-full bg-card/80 backdrop-blur-xl border-2 border-border p-8 md:p-10 rounded-[32px] shadow-soft space-y-8 animate-in fade-in zoom-in duration-300">
          <div className="space-y-3 text-center">
            <h1 className="text-4xl font-heading font-extrabold tracking-tight">AI Patient Chat</h1>
            <p className="text-muted-foreground font-medium text-lg">
              Select patient and phone number to place outbound PSTN call.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto pt-2">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <select
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-border bg-background focus:border-primary outline-none font-bold transition-all appearance-none cursor-pointer"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
              >
                <option value="">Select Patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.condition ? `— ${p.condition}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  className="w-[104px] px-3 py-4 rounded-2xl border-2 border-border bg-background focus:border-primary outline-none font-bold transition-all"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  <option value="+1">+1 (US)</option>
                  <option value="+91">+91 (India)</option>
                </select>
                <input
                  type="tel"
                  className="flex-1 px-4 py-4 rounded-2xl border-2 border-border bg-background focus:border-primary outline-none font-bold transition-all"
                  placeholder="Phone number"
                  value={callerNumber}
                  onChange={(e) => setCallerNumber(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={handleStartOutboundCall}
              disabled={!selectedPatient || !destinationNumberE164 || !session || isSaving}
              className="w-full py-5 bg-tertiary text-foreground font-heading font-bold rounded-full border-4 border-foreground shadow-pop disabled:opacity-50"
            >
              Start Phone Call
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPatientId("");
                setCallerNumber("");
                setSummaryData(null);
              }}
              disabled={isSaving}
              className="w-full py-5 bg-white text-foreground font-heading font-black rounded-full border-4 border-foreground shadow-pop disabled:opacity-50"
            >
              Clear
            </button>
          </div>

          {isSaving && (
            <p className="mt-3 text-xs text-muted-foreground text-center font-semibold">
              Dialing patient via Vapi… waiting for transcript
            </p>
          )}
          {!isSaving && errorMessage && (
            <p className="mt-3 text-xs text-destructive text-center font-semibold">
              {errorMessage}
            </p>
          )}
          {!isSaving && countryCode !== "+1" && (
            <p className="mt-1 text-xs text-muted-foreground text-center font-semibold">
              Free Vapi numbers usually dial US numbers only. Use +1 or upgrade your Vapi number plan.
            </p>
          )}
        </div>
      )}

      {showPostCallPopup && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border-2 border-border rounded-2xl p-6 shadow-soft space-y-4">
            <h3 className="text-2xl font-heading font-extrabold">Call Ended</h3>
            <p className="text-sm text-muted-foreground font-medium">
              Open the call log or alerts for this patient — data loads from the database after sync (not static).
            </p>
            <div className="flex flex-wrap gap-3">
              {recentDbCallId && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPostCallPopup(false);
                    navigate(`/dashboard/calls/${recentDbCallId}`);
                  }}
                  className="px-4 py-3 rounded-xl border-2 border-foreground bg-quaternary text-white font-bold"
                >
                  Open call detail
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowPostCallPopup(false);
                  navigate("/dashboard/alerts", {
                    state: {
                      focusPatientId: selectedPatientId,
                      focusCallId: recentDbCallId || recentCallId,
                    },
                  });
                }}
                className="px-4 py-3 rounded-xl border-2 border-foreground bg-secondary text-white font-bold"
              >
                Open alerts
              </button>
              <button
                type="button"
                onClick={() => setShowPostCallPopup(false)}
                className="px-4 py-3 rounded-xl border-2 border-foreground bg-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "dialing" && (
        <div className="flex flex-col items-center space-y-8 animate-in fade-in zoom-in duration-500 max-w-3xl w-full">
          <div className="w-16 h-16 bg-tertiary mx-auto rounded-full flex items-center justify-center border-4 border-white shadow-pop">
            <Phone className="w-8 h-8 text-foreground" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-heading font-black uppercase italic tracking-tighter">Dialing…</h2>
            <p className="text-xs text-muted-foreground font-semibold">
              Status: {callStatus}
            </p>
          </div>
          <button
            type="button"
            onClick={handleHangUpOutbound}
            disabled={!vapiCallId}
            className="px-6 py-3 bg-destructive text-white rounded-xl border-2 border-foreground shadow-pop disabled:opacity-50"
          >
            Hang Up
          </button>
          <div className="w-full max-w-3xl bg-card border border-border rounded-xl p-4 text-left space-y-2">
            <p className="text-xs font-black uppercase text-muted-foreground">Live Transcript</p>
            <p className="text-sm whitespace-pre-wrap min-h-[56px]">
              {liveTranscript || "Waiting for transcript..."}
            </p>
          </div>
          <div className="w-full max-w-3xl bg-card border border-border rounded-xl p-4 text-left space-y-2 max-h-48 overflow-auto">
            <p className="text-xs font-black uppercase text-muted-foreground">Debug Logs</p>
            {debugLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No logs yet.</p>
            ) : (
              debugLogs.map((line, idx) => (
                <p key={`${line}-${idx}`} className="text-xs font-mono">
                  {line}
                </p>
              ))
            )}
          </div>
        </div>
      )}

      {phase === "completed" && summaryData && (
        <div className="w-full max-w-4xl space-y-8 animate-in slide-in-from-bottom-12 duration-700">
           <div className="bg-card border-4 border-border rounded-[40px] shadow-soft overflow-hidden">
              <div className="bg-quaternary p-8 flex justify-between items-center text-white border-b-4 border-border">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                       <Clipboard className="w-8 h-8" />
                    </div>
                    <div>
                       <h2 className="text-3xl font-heading font-black uppercase tracking-tight text-white border-none bg-transparent m-0 leading-none">Clinical Assessment</h2>
                       <p className="font-bold opacity-80 uppercase text-xs tracking-widest text-white border-none bg-transparent mt-2">
                         {safeRender(summaryData.alert_type)}
                       </p>
                    </div>
                 </div>
                 <div className={`px-6 py-3 rounded-2xl border-2 border-white/50 backdrop-blur-md font-black italic text-xl uppercase ${summaryData.risk_level === 'high' ? 'bg-destructive ring-4 ring-destructive/30' : 'bg-primary'}`}>
                    {safeRender(summaryData.risk_level)} Risk
                 </div>
              </div>

              <div className="p-10 space-y-10">
                 <div className="space-y-4 text-left">
                    <h4 className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest text-sm border-none bg-transparent">
                       <Activity className="w-4 h-4 text-quaternary" /> Executive Summary
                    </h4>
                    <p className="text-2xl font-bold leading-relaxed">{safeRender(summaryData.summary)}</p>
                 </div>

                 <div className="grid md:grid-cols-2 gap-8">
                    <div className="p-6 bg-muted/40 rounded-3xl border-2 border-border space-y-4 text-left">
                       <h4 className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest text-sm border-none bg-transparent">
                          <AlertTriangle className="w-4 h-4 text-secondary" /> Triage / alert title
                       </h4>
                       <div className="p-4 bg-white border-2 border-border rounded-2xl font-black text-lg text-secondary shadow-pop uppercase italic">
                          {safeRender(summaryData.alert_type)}
                       </div>
                    </div>
                    
                    <div className="p-6 bg-muted/40 rounded-3xl border-2 border-border space-y-4 text-left">
                       <h4 className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest text-sm border-none bg-transparent">
                          <Clipboard className="w-4 h-4 text-primary" /> Symptoms (from call + chart)
                       </h4>
                       <div className="flex flex-wrap gap-2">
                          {summaryData.symptoms?.length ? (
                            summaryData.symptoms.map((s: any, i: number) => (
                             <span key={i} className="px-3 py-1 bg-white border-2 border-border rounded-full font-bold text-sm">
                                 {safeRender(s)}
                             </span>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground font-medium">No symptom list returned — see summary above.</span>
                          )}
                       </div>
                    </div>
                 </div>

                 {(summaryData.diagnosis || summaryData.relevant_history) && (
                   <div className="grid md:grid-cols-2 gap-6 text-left">
                     <div className="p-6 rounded-3xl border-2 border-border bg-background space-y-2">
                       <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Working impression / diagnosis</h4>
                       <p className="text-lg font-bold leading-snug">{safeRender(summaryData.diagnosis)}</p>
                     </div>
                     <div className="p-6 rounded-3xl border-2 border-border bg-background space-y-2">
                       <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Relevant history</h4>
                       <p className="text-sm font-medium leading-relaxed text-foreground">{safeRender(summaryData.relevant_history)}</p>
                     </div>
                   </div>
                 )}

                 {summaryData.clinical_reasoning ? (
                   <div className="p-6 rounded-3xl border-2 border-dashed border-border bg-muted/30 text-left space-y-2">
                     <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Clinical reasoning</h4>
                     <p className="text-sm font-medium leading-relaxed">{safeRender(summaryData.clinical_reasoning)}</p>
                   </div>
                 ) : null}

                 {summaryData.differential_diagnosis?.length ? (
                   <div className="text-left space-y-2">
                     <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Differential diagnoses</h4>
                     <div className="flex flex-wrap gap-2">
                       {summaryData.differential_diagnosis.map((d: any, i: number) => (
                         <span key={i} className="px-3 py-1 rounded-full border-2 border-border bg-card text-sm font-bold">
                           {safeRender(d)}
                         </span>
                       ))}
                     </div>
                   </div>
                 ) : null}

                 {summaryData.follow_up_plan ? (
                   <div className="p-6 rounded-3xl border-2 border-border bg-muted/20 text-left">
                     <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Follow-up plan</h4>
                     <p className="text-sm font-medium">{safeRender(summaryData.follow_up_plan)}</p>
                   </div>
                 ) : null}

                 <div className="p-8 bg-muted/80 rounded-3xl border-2 border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.keys(summaryData.vitals_data || {}).length === 0 ? (
                       <p className="col-span-full text-center text-sm text-muted-foreground font-medium py-4">
                         No extra vitals key/value pairs from the model for this call.
                       </p>
                    ) : (
                    Object.entries(summaryData.vitals_data).map(([key, val]: any) => (
                       <div key={key} className="text-center p-3 bg-white rounded-2xl border-2 border-border shadow-soft">
                          <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-tighter">{key.replace('_',' ')}</p>
                          <p className="text-lg font-black text-foreground">{safeRender(val)}</p>
                       </div>
                    ))
                    )}
                 </div>

                 <div className="p-8 bg-secondary/5 rounded-3xl border-4 border-dashed border-secondary/30 flex items-center justify-between text-left">
                    <div>
                       <h4 className="text-secondary font-black uppercase tracking-widest text-sm mb-1 border-none bg-transparent">Recommended Action</h4>
                       <p className="text-xl font-bold">{safeRender(summaryData.action_required)}</p>
                    </div>
                    <Shield className="w-12 h-12 text-secondary opacity-20" />
                 </div>
              </div>

              <div className="p-8 bg-muted border-t-4 border-border flex flex-wrap gap-4">
                 {summaryData?.call_db_id && (
                   <button
                     type="button"
                     onClick={() => navigate(`/dashboard/calls/${summaryData.call_db_id}`)}
                     className="px-8 py-5 bg-quaternary text-white font-heading font-black uppercase rounded-2xl border-4 border-foreground shadow-pop hover:-translate-y-1 transition-all"
                   >
                     Full call log
                   </button>
                 )}
                 <button 
                 type="button"
                 onClick={() => {
                   setPhase("idle");
                   setSummaryData(null);
                   setVapiCallId(null);
                 }} 
                  className="flex-1 min-w-[140px] py-5 bg-white text-foreground font-heading font-black uppercase rounded-2xl border-4 border-foreground shadow-pop hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                 >
                    New Call
                 </button>
                 <button 
                 type="button"
                 onClick={() => setPhase("idle")} 
                 className="px-10 py-5 bg-tertiary text-foreground font-heading font-black uppercase rounded-2xl border-4 border-foreground shadow-pop hover:-translate-y-1 transition-all"
                 >
                    Back to Setup
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
