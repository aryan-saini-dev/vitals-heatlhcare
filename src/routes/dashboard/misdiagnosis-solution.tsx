import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, Fingerprint, Mic, Square } from "lucide-react";
import jsPDF from "jspdf";

export const Route = createFileRoute("/dashboard/misdiagnosis-solution")({
  component: MisdiagnosisSolution,
});

export default function MisdiagnosisSolution() {
  const [isListening, setIsListening] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [mockHash, setMockHash] = useState("");
  const [status, setStatus] = useState("Idle");
  const [recognitionRef, setRecognitionRef] = useState<any>(null);

  const transcriptLength = useMemo(() => transcript.trim().length, [transcript]);

  async function sha256(text: string) {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function startDiagnosisTranscription() {
    const AnyWindow = window as any;
    const SpeechRecognition = AnyWindow.SpeechRecognition || AnyWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("Speech recognition not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("Listening...");
    };
    recognition.onend = () => {
      setIsListening(false);
      setLiveText("");
      setStatus("Stopped");
    };
    recognition.onerror = (event: any) => {
      setStatus(`Recognition error: ${event.error || "unknown"}`);
    };
    recognition.onresult = (event: any) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (finalText) setTranscript((prev) => `${prev} ${finalText}`.trim());
      setLiveText(interim);
    };

    setRecognitionRef(recognition);
    recognition.start();
  }

  async function endDiagnosisAndGenerate() {
    if (recognitionRef) recognitionRef.stop();
    const normalized = transcript.trim();
    if (!normalized) {
      setStatus("No transcript captured yet.");
      return;
    }
    const hash = await sha256(normalized);
    setMockHash(hash);
    setStatus("Diagnosis ended. Mock blockchain hash generated.");
  }

  function downloadPrescriptionPdf() {
    if (!transcript.trim()) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 44;
    let y = 56;
    doc.setFontSize(18);
    doc.text("Doctor Prescription / Diagnosis Report", margin, y);
    y += 24;
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 16;
    doc.text(`Blockchain Hash (simulation): ${mockHash || "Pending. End diagnosis first."}`, margin, y);
    y += 22;
    doc.setFontSize(12);
    doc.text("Transcription", margin, y);
    y += 14;
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(transcript.trim(), 520);
    doc.text(lines, margin, y);
    doc.save(`misdiagnosis-report-${Date.now()}.pdf`);
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="border-b border-border/40 pb-5">
        <h1 className="text-3xl font-display font-extrabold tracking-tight text-foreground">Misdiagnosis Solution</h1>
        <p className="mt-1 text-sm text-muted-foreground font-medium">
          Frontend simulation to record diagnosis transcription, generate mock accountability hash, and export PDFs.
        </p>
      </div>

      <div className="bg-card border border-border/60 rounded-2xl shadow-card p-6 space-y-6">
        {/* Buttons Panel */}
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={startDiagnosisTranscription}
            disabled={isListening}
            className="inline-flex items-center gap-1.5 h-10 px-5 bg-gradient-primary text-primary-foreground font-bold rounded-xl shadow-glow transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
          >
            <Mic className="w-4 h-4" /> Start Recording
          </button>
          <button
            type="button"
            onClick={endDiagnosisAndGenerate}
            disabled={!isListening}
            className="inline-flex items-center gap-1.5 h-10 px-5 bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 text-destructive font-bold rounded-xl transition-all disabled:opacity-50"
          >
            <Square className="w-4 h-4" /> Stop & Hash
          </button>
          <button
            type="button"
            onClick={downloadPrescriptionPdf}
            disabled={!transcript.trim()}
            className="inline-flex items-center gap-1.5 h-10 px-5 bg-success/15 hover:bg-success hover:text-success-foreground border border-success/20 text-success font-bold rounded-xl transition-all disabled:opacity-50"
          >
            <FileText className="w-4 h-4" /> Download Prescription PDF
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Status: <span className="text-foreground">{status}</span>
        </div>

        {liveText && (
          <p className="text-xs text-primary font-medium italic animate-pulse">
            Live Stream: {liveText}
          </p>
        )}

        {/* Stored Transcription */}
        <div className="border border-border/60 rounded-xl p-5 bg-background shadow-soft">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Captured Transcription
          </p>
          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed min-h-[120px]">
            {transcript || "No transcription recorded yet. Press 'Start Recording' to stream mic voice..."}
          </p>
        </div>

        {/* Blockchain Hash Card */}
        <div className="border border-border/50 rounded-xl p-5 bg-secondary/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1.5">
            <Fingerprint className="w-4 h-4 text-primary" /> Cryptographic Blockchain Hash (Simulation)
          </p>
          <p className="text-xs font-mono text-foreground break-all leading-normal bg-background/50 border border-border/40 p-2.5 rounded-lg min-h-[38px] flex items-center">
            {mockHash || "Awaiting diagnosis completion to generate cryptographic audit hash..."}
          </p>
        </div>

        <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl text-[10px] leading-relaxed text-muted-foreground">
          <span className="font-bold text-foreground">Simulation Notice:</span> The cryptographic hash is generated locally using SHA-256 for audit tracking. In production, this anchors to blockchain ledgers for tamper-proof compliance.
        </div>
      </div>
    </div>
  );
}
