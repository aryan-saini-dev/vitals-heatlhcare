import PDFDocument from "pdfkit";
import type { ReportData } from "../utils/helpers.js";

// ─── PDF Report Generation Service ───────────────────────────────────────────

function wrapTextToWidth(text: string, maxChars: number): string[] {
  const normalized = (text || "N/A").replace(/\s+/g, " ").trim() || "N/A";
  const words = normalized.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= maxChars) line = next;
    else {
      if (line) lines.push(line);
      line = w.length > maxChars ? `${w.slice(0, maxChars - 1)}…` : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function writeParagraph(doc: InstanceType<typeof PDFDocument>, text: string, fontSize = 10) {
  doc.fontSize(fontSize);
  wrapTextToWidth(text, 92).forEach((ln) => doc.text(ln));
  doc.moveDown(0.5);
}

export function generateReportPdfBuffer(input: {
  callId: string;
  patientName: string;
  patientCondition: string;
  patientAge?: string;
  durationSeconds: number;
  transcriptSnippet?: string;
  report: ReportData;
  /** Logged-in clinician email (Supabase user) for audit trail on PDF */
  doctorEmail?: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 48, size: "A4" });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c as Buffer));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(18).text("Vitals – Clinical Summary Report", { align: "center" });
      doc.moveDown(0.4);
      doc.fontSize(9).fillColor("#333333").text("(Prescription-style summary for clinician review – not a legal medical record)", {
        align: "center",
      });
      doc.fillColor("black");
      doc.moveDown(0.8);

      doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`);
      doc.text(`Internal record ID: ${input.callId}`);
      if (input.doctorEmail) {
        doc.text(`Attending clinician (account): ${input.doctorEmail}`);
      }
      doc.text(
        `Call duration: ${Math.floor(input.durationSeconds / 60)}m ${input.durationSeconds % 60}s`,
      );
      doc.moveDown(0.6);

      doc.fontSize(12).text("Patient", { underline: true });
      doc.moveDown(0.25);
      doc.fontSize(10);
      doc.text(`Name: ${input.patientName || "Unknown"}`);
      doc.text(`Known condition / focus: ${input.patientCondition || "N/A"}`);
      if (input.patientAge) doc.text(`Age: ${input.patientAge}`);
      doc.moveDown(0.6);

      doc.fontSize(12).text("Relevant history & context", { underline: true });
      doc.moveDown(0.25);
      writeParagraph(doc, input.report.relevant_history || "See summary below.", 10);

      doc.fontSize(12).text("Executive summary", { underline: true });
      doc.moveDown(0.25);
      writeParagraph(doc, input.report.summary, 11);

      doc.fontSize(12).text("Symptoms reported / observed", { underline: true });
      doc.moveDown(0.25);
      const symptoms = input.report.symptoms?.length ? input.report.symptoms : ["None explicitly stated"];
      symptoms.forEach((s) => {
        doc.fontSize(10).text(`• ${s}`);
      });
      doc.moveDown(0.5);

      doc.fontSize(12).text("Clinical impression (working diagnosis)", { underline: true });
      doc.moveDown(0.25);
      writeParagraph(doc, input.report.diagnosis, 11);

      doc.fontSize(12).text("Clinical reasoning (brief)", { underline: true });
      doc.moveDown(0.25);
      writeParagraph(doc, input.report.clinical_reasoning, 10);

      const diffs = input.report.differential_diagnosis?.filter(Boolean) || [];
      if (diffs.length) {
        doc.fontSize(12).text("Differential considerations (for review)", { underline: true });
        doc.moveDown(0.25);
        diffs.forEach((d) => doc.fontSize(10).text(`• ${d}`));
        doc.moveDown(0.5);
      }

      doc.fontSize(12).text("Structured vitals / measurements (from AI extract)", { underline: true });
      doc.moveDown(0.25);
      const vitalsEntries = Object.entries(input.report.vitals_data || {});
      if (!vitalsEntries.length) {
        doc.fontSize(10).text("None captured in structured form.");
      } else {
        vitalsEntries.forEach(([k, v]) => doc.fontSize(10).text(`${k}: ${String(v)}`));
      }
      doc.moveDown(0.5);

      doc.fontSize(12).text("Triage / alert", { underline: true });
      doc.moveDown(0.25);
      doc.fontSize(10).text(`Risk level: ${input.report.risk_level || "N/A"}`);
      doc.text(`Alert type: ${input.report.alert_type || "N/A"}`);
      doc.moveDown(0.4);

      doc.fontSize(12).text("Plan & follow-up", { underline: true });
      doc.moveDown(0.25);
      writeParagraph(doc, input.report.follow_up_plan || input.report.action_required, 10);

      doc.fontSize(12).text("Immediate actions recommended", { underline: true });
      doc.moveDown(0.25);
      writeParagraph(doc, input.report.action_required, 10);

      // ── Scheduled follow-up appointment & call ─────────────────────────────────────────────
      if (input.report.appointment || input.report.follow_up_call) {
        doc.moveDown(0.4);
        doc.fontSize(12).fillColor("#003366").text("Scheduling & Follow-ups", { underline: true });
        doc.fillColor("black");
        doc.moveDown(0.25);
        
        if (input.report.appointment) {
          const appt = input.report.appointment;
          doc.fontSize(11).font("Helvetica-Bold").text("Clinic Appointment:");
          doc.font("Helvetica").text(`📅  ${appt.date}   |   🕐  ${appt.time}`);
          doc.fontSize(9).fillColor("#555555").text("Please arrive 10 minutes early. Bring your medication list and any recent lab results.");
          doc.fillColor("black").moveDown(0.3);
        }

        if (input.report.follow_up_call) {
          const callSched = input.report.follow_up_call;
          doc.fontSize(11).font("Helvetica-Bold").text("Next AI Follow-up Call:");
          doc.font("Helvetica").text(`📞  ${callSched.date}   |   🕐  ${callSched.time}`);
          doc.fontSize(9).fillColor("#555555").text("You will receive an automated check-in call directly to your registered phone number.");
          doc.fillColor("black").moveDown(0.3);
        }
        doc.moveDown(0.5);
      }

      if (input.transcriptSnippet) {
        doc.addPage();
        doc.fontSize(12).text("Call transcript (excerpt)", { underline: true });
        doc.moveDown(0.25);
        const excerpt =
          input.transcriptSnippet.length > 8000
            ? `${input.transcriptSnippet.slice(0, 8000)}\n\n[... truncated ...]`
            : input.transcriptSnippet;
        writeParagraph(doc, excerpt, 9);
      }

      doc.moveDown();
      doc.fontSize(8).fillColor("gray").text(
        "Disclaimer: This document was produced with AI-assisted summarization and must be verified by a licensed clinician. It is not a prescription or formal diagnosis.",
        { align: "left" },
      );
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
