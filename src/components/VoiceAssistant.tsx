import { useEffect, useRef, useState } from "react";
import type Vapi from "@vapi-ai/web";

type RiskLevel = "low" | "medium" | "high";

export type PatientInfo = {
  id: string;
  name: string;
  condition?: string | null;
  age?: number | null;
  risk_level?: RiskLevel | null;
};

type CallStatus =
  | "idle"
  | "requesting-permission"
  | "connecting"
  | "listening"
  | "speaking"
  | "ended"
  | "error";

export type VoiceAssistantProps = {
  patient: PatientInfo | null;
  callerPhoneNumber: string;
  agentId?: string;
  onCallFinished?: (payload: {
    transcript: string;
    durationSeconds: number;
  }) => void;
};

type TranscriptTurn = {
  speaker: "agent" | "patient";
  text: string;
};

let vapiClient: Vapi | null = null;

async function getVapiClient(): Promise<Vapi | null> {
  if (typeof window === "undefined") return null;
  if (vapiClient) return vapiClient;

  const publicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
  console.log("[VapiDebug] VITE_VAPI_PUBLIC_KEY:", publicKey);
  console.log("[VapiDebug] import.meta.env keys:", Object.keys(import.meta.env || {}));
  if (!publicKey) {
    console.error("Missing VITE_VAPI_PUBLIC_KEY for Vapi Web SDK");
    return null;
  }

  try {
    const mod = await import("@vapi-ai/web");
    const VapiCtor = mod.default;
    vapiClient = new VapiCtor(publicKey);
    return vapiClient;
  } catch (e) {
    console.error("Failed to load @vapi-ai/web SDK:", e);
    return null;
  }
}

export function VoiceAssistant({
  patient,
  callerPhoneNumber,
  agentId,
  onCallFinished,
}: VoiceAssistantProps) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [transcriptTurns, setTranscriptTurns] = useState<TranscriptTurn[]>([]);
  const onCallFinishedRef = useRef(onCallFinished);

  useEffect(() => {
    onCallFinishedRef.current = onCallFinished;
  }, [onCallFinished]);

  const timerRef = useRef<number | null>(null);
  const callStartedAtRef = useRef<number | null>(null);
  const hasActiveCallRef = useRef(false);
  const transcriptTurnsRef = useRef<TranscriptTurn[]>([]);
  const durationSecondsRef = useRef(0);
  const listenersRegisteredRef = useRef(false);

  const resolvedAgentId = agentId || import.meta.env.VITE_VAPI_AGENT_ID || "";

  async function ensureEventListeners(vapi: Vapi) {
    if (listenersRegisteredRef.current) return;
    listenersRegisteredRef.current = true;

    const handleCallStart = () => {
      console.log("[Vapi] call-start");
      hasActiveCallRef.current = true;
      callStartedAtRef.current = Date.now();
      transcriptTurnsRef.current = [];
      setTranscriptTurns([]);
      durationSecondsRef.current = 0;
      setDurationSeconds(0);

      setStatus("listening");
      setIsListening(true);
      setIsSpeaking(false);

      if (timerRef.current != null) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        if (callStartedAtRef.current != null) {
          const diffSeconds = Math.floor((Date.now() - callStartedAtRef.current) / 1000);
          durationSecondsRef.current = diffSeconds;
          setDurationSeconds(diffSeconds);
        }
      }, 1000);
    };

    const handleCallEnd = () => {
      console.log("[Vapi] call-end");
      hasActiveCallRef.current = false;
      setIsListening(false);
      setIsSpeaking(false);
      setStatus("ended");

      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const combinedTranscript = transcriptTurnsRef.current
        .map((turn) => (turn.speaker === "agent" ? `Agent: ${turn.text}` : `Patient: ${turn.text}`))
        .join("\n\n");

      if (onCallFinishedRef.current) {
        onCallFinishedRef.current({
          transcript: combinedTranscript,
          durationSeconds: durationSecondsRef.current,
        });
      }
    };

    const handleSpeechStart = () => {
      if (!hasActiveCallRef.current) return;
      console.log("[Vapi] speech-start (AI speaking)");
      setIsSpeaking(true);
      setIsListening(false);
      setStatus("speaking");
    };

    const handleSpeechEnd = () => {
      if (!hasActiveCallRef.current) return;
      console.log("[Vapi] speech-end (AI stopped)");
      setIsSpeaking(false);
      setIsListening(true);
      setStatus("listening");
    };

    const handleMessage = (message: unknown) => {
      const msg = message as {
        type?: string;
        transcript?: unknown;
        role?: unknown;
        isFinal?: unknown;
        final?: unknown;
      } | null;

      if (msg?.type !== "transcript" || !msg.transcript) return;

      if (typeof msg.isFinal === "boolean" && msg.isFinal === false) return;
      if (typeof msg.final === "boolean" && msg.final === false) return;

      const role = String(msg.role ?? "").toLowerCase();
      const speaker: TranscriptTurn["speaker"] =
        role === "assistant" || role === "agent" ? "agent" : "patient";

      const trimmed = String(msg.transcript).trim();
      if (!trimmed) return;

      const last = transcriptTurnsRef.current[transcriptTurnsRef.current.length - 1];
      if (last && last.speaker === speaker && last.text === trimmed) return;

      console.log("[Vapi] transcript:", speaker, trimmed);

      transcriptTurnsRef.current = [...transcriptTurnsRef.current, { speaker, text: trimmed }];
      setTranscriptTurns(transcriptTurnsRef.current);
    };

    const handleError = (e: unknown) => {
      console.error("[Vapi] error:", e);
      setErrorMessage("Call error. Please try again.");
      setStatus("error");
      setIsListening(false);
      setIsSpeaking(false);
      hasActiveCallRef.current = false;

      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    vapi.on("call-start", handleCallStart);
    vapi.on("call-end", handleCallEnd);
    vapi.on("speech-start", handleSpeechStart);
    vapi.on("speech-end", handleSpeechEnd);
    vapi.on("message", handleMessage);
    vapi.on("error", handleError);
  }

  async function handleStartCall() {
    setErrorMessage(null);

    if (!patient) {
      setErrorMessage("Select a patient first.");
      return;
    }
    const digits = callerPhoneNumber.replace(/\D/g, "");
    if (digits.length < 7) {
      setErrorMessage("Enter your phone number (include at least 7 digits).");
      return;
    }
    if (!resolvedAgentId) {
      setErrorMessage("Missing Vapi agent id (VITE_VAPI_AGENT_ID).");
      return;
    }

    const vapi = await getVapiClient();
    if (!vapi) {
      setErrorMessage(
        "Vapi failed to load. Ensure VITE_VAPI_PUBLIC_KEY is configured in your environmental variables."
      );
      return;
    }

    try {
      console.log("[Vapi] Starting call for agent:", resolvedAgentId);
      setStatus("requesting-permission");

      await navigator.mediaDevices.getUserMedia({ audio: true });

      await ensureEventListeners(vapi);

      setStatus("connecting");
      transcriptTurnsRef.current = [];
      setTranscriptTurns([]);
      durationSecondsRef.current = 0;
      setDurationSeconds(0);

      const assistantOverrides = {
        variableValues: {
          patientId: patient.id,
          patientName: patient.name,
          patientCondition: patient.condition || "",
          patientAge: patient.age ?? "",
          patientRiskLevel: patient.risk_level || "",
          callerNumber: callerPhoneNumber,
        },
      };

      vapi.start(resolvedAgentId, assistantOverrides);
    } catch (err) {
      console.error("Failed to start call", err);
      setErrorMessage("Microphone permission denied or call failed.");
      setStatus("error");
    }
  }

  function handleHangUp() {
    void (async () => {
      const vapi = await getVapiClient();
      if (!vapi) return;
      console.log("[Vapi] stop()");
      vapi.stop();
    })();
  }

  function formatDuration(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  let statusLabel = "Idle";
  if (status === "requesting-permission") statusLabel = "Requesting microphone permission…";
  else if (status === "connecting") statusLabel = "Connecting…";
  else if (status === "listening") statusLabel = "Listening…";
  else if (status === "speaking") statusLabel = "AI Speaking…";
  else if (status === "ended") statusLabel = "Call ended.";
  else if (status === "error") statusLabel = "Error.";

  return (
    <div className="w-full rounded-2xl border border-border bg-card shadow-card p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
            AI Patient Call
          </p>
          <p className="text-base font-display font-extrabold text-foreground">
            {patient ? patient.name : "No patient selected"}
          </p>
          {patient?.condition && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Condition: {patient.condition}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
            Status
          </p>
          <p className="text-xs font-bold text-foreground">{statusLabel}</p>
          {hasActiveCallRef.current && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Duration: {formatDuration(durationSeconds)}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 border ${
            isListening
              ? "border-success/35 text-success bg-success/10 animate-pulse"
              : "border-border text-muted-foreground"
          }`}
        >
          • Listening
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 border ${
            isSpeaking
              ? "border-primary/35 text-primary bg-primary/10"
              : "border-border text-muted-foreground"
          }`}
        >
          • AI Speaking
        </span>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleStartCall}
          disabled={
            status === "connecting" ||
            status === "requesting-permission" ||
            hasActiveCallRef.current ||
            !patient ||
            !callerPhoneNumber.trim()
          }
          className="flex-1 h-10 rounded-xl bg-gradient-primary text-primary-foreground font-bold shadow-glow hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 transition-all text-xs"
        >
          {status === "connecting" || status === "requesting-permission"
            ? "Connecting…"
            : "Start Call"}
        </button>
        <button
          type="button"
          onClick={handleHangUp}
          disabled={!hasActiveCallRef.current}
          className="flex-1 h-10 rounded-xl bg-destructive text-destructive-foreground font-bold hover:bg-destructive/90 disabled:opacity-50 transition-all text-xs"
        >
          Hang Up
        </button>
      </div>

      {errorMessage && (
        <p className="text-xs text-destructive font-semibold text-center">{errorMessage}</p>
      )}

      {transcriptTurns.length > 0 && (
        <div className="mt-4 max-h-56 overflow-y-auto rounded-xl border border-border bg-background p-4 space-y-3 text-xs leading-relaxed">
          {transcriptTurns.map((turn, idx) => (
            <div key={idx} className="flex gap-2">
              <span className="font-bold text-muted-foreground uppercase text-[9px] w-12 shrink-0 pt-0.5">
                {turn.speaker === "agent" ? "AI:" : "Patient:"}
              </span>
              <span className="text-foreground">{turn.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
