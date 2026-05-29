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

  // Dynamic import prevents CSP 'unsafe-eval' crashes on initial page load.
  // If your CSP blocks Vapi at runtime, you will still see errors when you click Start Call.
  const publicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
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

  // Keep handlers stable so we can correctly unregister.
  const handleCallEndRef = useRef<(() => void) | null>(null);

  const resolvedAgentId =
    agentId || import.meta.env.VITE_VAPI_AGENT_ID || "";

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
          const diffSeconds = Math.floor(
            (Date.now() - callStartedAtRef.current) / 1000
          );
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
        .map((turn) =>
          turn.speaker === "agent"
            ? `Agent: ${turn.text}`
            : `Patient: ${turn.text}`
        )
        .join("\n\n");

      if (onCallFinishedRef.current) {
        onCallFinishedRef.current({
          transcript: combinedTranscript,
          durationSeconds: durationSecondsRef.current,
        });
      }
    };
    handleCallEndRef.current = handleCallEnd;

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
      const msg = message as
        | {
            type?: string;
            transcript?: unknown;
            role?: unknown;
            isFinal?: unknown;
            final?: unknown;
          }
        | null;

      if (msg?.type !== "transcript" || !msg.transcript) return;

      // Skip interim chunks if Vapi provides finality flags.
      if (typeof msg.isFinal === "boolean" && msg.isFinal === false) return;
      if (typeof msg.final === "boolean" && msg.final === false) return;

      const role = String(msg.role ?? "").toLowerCase();
      const speaker: TranscriptTurn["speaker"] =
        role === "assistant" || role === "agent" ? "agent" : "patient";

      const trimmed = String(msg.transcript).trim();
      if (!trimmed) return;

      const last = transcriptTurnsRef.current[
        transcriptTurnsRef.current.length - 1
      ];
      if (last && last.speaker === speaker && last.text === trimmed) return;

      console.log("[Vapi] transcript:", speaker, trimmed);

      transcriptTurnsRef.current = [
        ...transcriptTurnsRef.current,
        { speaker, text: trimmed },
      ];
      setTranscriptTurns(transcriptTurnsRef.current);
    };

    const handleError = (e: unknown) => {
      console.error("[Vapi] error:", e);
      const maybe = e as { type?: string; error?: unknown };
      if (maybe?.type) console.error("[Vapi] error.type:", maybe.type);
      if (maybe?.error) console.error("[Vapi] error.detail:", maybe.error);
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
        "Vapi failed to load. If you see CSP errors about 'eval', allow 'unsafe-eval' for Vapi (or relax CSP for this page)."
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
    // fire-and-forget: Hangup should be immediate from UI.
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
    <div className="w-full max-w-xl mx-auto rounded-2xl border-2 border-border bg-card shadow-soft p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">
            AI Patient Call
          </p>
          <p className="text-lg font-heading font-extrabold">
            {patient ? patient.name : "No patient selected"}
          </p>
          {patient?.condition && (
            <p className="text-xs text-muted-foreground">
              Condition: {patient.condition}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">
            Status
          </p>
          <p className="text-sm font-semibold">{statusLabel}</p>
          {hasActiveCallRef.current && (
            <p className="text-xs text-muted-foreground">
              Duration: {formatDuration(durationSeconds)}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 border ${
            isListening
              ? "border-quaternary text-foreground bg-quaternary/10"
              : "border-border text-muted-foreground"
          }`}
        >
          • Listening
        </span>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 border ${
            isSpeaking
              ? "border-primary text-primary bg-primary/10"
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
          className="flex-1 h-11 rounded-full bg-primary text-white font-heading font-bold border-2 border-border shadow-pop hover:bg-medical-blue-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "connecting" || status === "requesting-permission"
            ? "Connecting…"
            : "Start Call"}
        </button>
        <button
          type="button"
          onClick={handleHangUp}
          disabled={!hasActiveCallRef.current}
          className="flex-1 h-11 rounded-full bg-destructive text-white font-heading font-bold border-2 border-border disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Hang Up
        </button>
      </div>

      {errorMessage && (
        <p className="text-xs text-destructive font-semibold">{errorMessage}</p>
      )}

      {transcriptTurns.length > 0 && (
        <div className="mt-4 max-h-56 overflow-y-auto rounded-lg border border-border bg-background p-3 space-y-2 text-sm">
          {transcriptTurns.map((turn, idx) => (
            <div key={idx} className="space-x-1">
              <span className="font-semibold text-muted-foreground">
                {turn.speaker === "agent" ? "AI:" : "Patient:"}
              </span>
              <span>{turn.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

