import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseJsonFromModelText } from "../utils/helpers.js";

// ─── LLM (Gemini) Service ─────────────────────────────────────────────────────

function getGeminiModel() {
  const geminiApiKey =
    process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
  if (!geminiApiKey) throw new Error("Missing Gemini API key env var");
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

/**
 * Step 1 of the report pipeline:
 * Clean a raw (possibly multilingual) transcript into structured English-only text.
 * Preserves speaker roles (Patient / Agent), removes filler words, normalises medical terms,
 * and translates any non-English segments into English.
 */
export async function cleanTranscriptToEnglish(rawTranscript: string): Promise<string> {
  const model = getGeminiModel();

  const prompt = `You are a medical transcript processor. Your job is to take a raw call transcript that may contain:
- Multiple languages (Hindi, Spanish, regional dialects, etc.)
- Filler words (um, uh, hmm, like, you know)
- Repetitions and false starts
- Unclear formatting

Process the transcript through these steps and output ONLY the cleaned result:

1. **Translate**: Convert ALL non-English segments into fluent, natural English. Preserve the medical/clinical meaning precisely.
2. **Clean**: Remove filler words, stutters, false starts, and repetitions.
3. **Preserve roles**: Keep speaker labels exactly as "Patient:" or "Agent:" at the start of each turn.
4. **Medical accuracy**: Keep all medical terms, drug names, dosages, vitals, symptoms, and clinical details EXACTLY as stated. Do NOT paraphrase medical content.
5. **Formatting**: One speaker turn per paragraph, separated by blank lines. Keep it chronological.
6. **If the transcript is already clean English**: Return it as-is with only minor formatting fixes.

IMPORTANT: Output ONLY the cleaned transcript text. No commentary, no preamble, no wrapper. Just the cleaned conversation.

Raw transcript:
${rawTranscript}`;

  const result = await model.generateContent(prompt);
  const cleaned = result.response.text().trim();
  console.log(
    "[TranscriptCleaner] raw chars:", rawTranscript.length,
    "→ cleaned chars:", cleaned.length,
  );
  return cleaned;
}

/**
 * Step 2 of the report pipeline:
 * Generate a well-structured clinical report from a CLEANED English transcript + patient chart.
 */
export async function generateStructuredReport(cleanedTranscript: string, patientChartJson: string, userPrompt?: string) {
  const model = getGeminiModel();

  let prompt = `You are a clinical documentation AI. Generate a precise, concise medical report from the call below. Be brief and factual — clinicians are busy.

Patient chart:
${patientChartJson || "{}"}

Call transcript:
${cleanedTranscript}

RULES:
- Only include findings the PATIENT explicitly stated. Do not invent.
- Be concise: maximum 2 sentences per text field.
- Symptoms must be concrete patient-reported items only.
- Use standard clinical terminology.

Output ONLY a JSON object (no markdown wrapper):
{
  "summary": "1-2 sentence handoff note: chief complaint + key finding + current status.",
  "relevant_history": "1-2 sentences: relevant chart conditions + anything the patient mentioned about their history.",
  "diagnosis": "Working impression in ≤1 sentence (not a definitive diagnosis).",
  "clinical_reasoning": "2-3 sentences: key evidence for impression + any contradicting factor + top red flag if present.",
  "differential_diagnosis": ["Alt 1 — one-line rationale", "Alt 2 — one-line rationale"],
  "risk_level": "high" | "medium" | "low",
  "alert_type": "Short triage label, e.g. 'Uncontrolled hypertension' or 'Routine diabetic check — stable'",
  "symptoms": ["Symptom — patient said: \\"brief quote\\""],
  "vitals_data": { "BP": "120/80", "HR": "72" },
  "action_required": "1-2 specific next steps for the care team.",
  "follow_up_plan": "1-2 sentences: timeline + escalation trigger."
}`;

  if (userPrompt && userPrompt.trim() !== "") {
    prompt += `\n\nCRITICAL OVERRIDE INSTRUCTIONS FROM THE DOCTOR:\nThe doctor has requested the following specific changes to the report formatting or content:\n"${userPrompt}"\nYou absolutely MUST obey these instructions during this generation phase, overwriting any defaults if necessary.\n`;
  }

  const result = await model.generateContent(prompt);
  return parseJsonFromModelText(result.response.text());
}

export async function generateDoctorSummaryServer(transcript: string, patientChartJson: string) {
  const model = getGeminiModel();

  const prompt = `You are documenting a phone check-in for a licensed clinician. Be precise and concise — no fluff.

Patient chart:
${patientChartJson || "{}"}

Call transcript:
${transcript}

RULES:
- Only report what the patient actually said. Do not invent.
- Keep every text field to 1-2 sentences maximum.
- Symptoms must map directly to patient statements.

Output ONLY a JSON object (no markdown wrapper):
{
  "summary": "1-2 sentence handoff note: chief complaint + status.",
  "relevant_history": "1 sentence: key chronic conditions or relevant chart context.",
  "diagnosis": "≤1 sentence working impression (not definitive).",
  "clinical_reasoning": "2 sentences: main evidence + one contradicting factor or red flag.",
  "differential_diagnosis": ["Alt 1", "Alt 2"],
  "risk_level": "high" | "medium" | "low",
  "alert_type": "Short triage label, e.g. 'Chest pain — rule out ACS' or 'Stable diabetic check-in'",
  "symptoms": ["Symptom — patient said: \\"brief quote\\""],
  "vitals_data": { "BP": "120/80" },
  "action_required": "1-2 specific next steps.",
  "follow_up_plan": "1 sentence: follow-up timeline + when to escalate."
}`;
  const result = await model.generateContent(prompt);
  return parseJsonFromModelText(result.response.text());
}
