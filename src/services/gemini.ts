import { GoogleGenerativeAI, FunctionDeclaration, Schema, SchemaType } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export function createPatientChatSession(patient: any) {
  if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY in .env.local");

  const systemInstruction = `You are VITALS (Virtual Intelligent Triage and Logging System). 
Current Patient: ${patient.name}, Condition: ${patient.condition}.

CRITICAL VOICE CONSTRAINTS:
1. Speak like a HUMAN medical assistant, not a robot. Be empathetic but professional.
2. Keep responses EXTREMELY BRIEF (max 15-20 words). Short sentences minimize voice latency.
3. Ask exactly ONE focus question at a time.
4. If you use a tool (history/alerts), do NOT announce it. Just use the data.
5. Proactively look for symptoms of ${patient.condition} (e.g. if it's CHF, ask about swelling or breathlessness).
6. Do NOT give medical advice. Your goal is to gather data for the doctor.

TONE: Warm, efficient, clinical but caring.`;

  const getPatientHistoryDecl: FunctionDeclaration = {
     name: "get_patient_history",
     description: "Check past vitals and symptoms to identify trends.",
     parameters: {
       type: SchemaType.OBJECT,
       properties: { patient_id: { type: SchemaType.STRING } },
       required: ["patient_id"]
     }
  };

  const getActiveAlertsDecl: FunctionDeclaration = {
     name: "get_active_alerts",
     description: "Check for unresolved clinical alerts.",
     parameters: {
       type: SchemaType.OBJECT,
       properties: { patient_id: { type: SchemaType.STRING } },
       required: ["patient_id"]
     }
  };

  const modelWithSystem = genAI.getGenerativeModel({ 
     model: "gemini-2.5-flash", // Per user preference
     systemInstruction: systemInstruction,
     tools: [{ functionDeclarations: [getPatientHistoryDecl, getActiveAlertsDecl] }]
  });

  return modelWithSystem.startChat({
    history: [],
    generationConfig: { temperature: 0.4, maxOutputTokens: 150 }
  });
}

export async function generateDoctorSummary(transcript: string) {
  if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY in .env.local");
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });



  const prompt = `Act as a senior triage nurse. Analyze this patient call transcript and extract clinical data.
Transcript:
${transcript}

Output ONLY a JSON object:
{
  "summary": "1-2 sentence clinical summary.",
  "risk_level": "high" | "medium" | "low",
  "alert_type": "Medical Title (e.g. Respiratory Distress, Routine Clear)",
  "symptoms": ["Symptom1", "Symptom2"],
  "vitals_data": { "key": "value" },
  "action_required": "Clinical next step"
}`;


  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const rawJson = jsonMatch ? jsonMatch[1] : text;

  try {
    return JSON.parse(rawJson.trim());
  } catch (err) {
    console.error("JSON Parse Error", rawJson);
    throw new Error("Cloud analysis failed.");
  }
}
