# VITALS: Agentic AI Healthcare

<p align="center">
  <img src="Assets/Vitals%20Logo.png" alt="VITALS Logo" width="200"/>
</p>

<p align="center">
  <strong>AI-powered voice calling system for proactive chronic patient monitoring and automated clinical documentation</strong>
</p>

---

## 👥 Contributors

| Name | GitHub |
| :--- | :--- |
| **Aryan Saini** | [@aryan-saini-dev](https://github.com/aryan-saini-dev) |
| **Aryan Gusain** | [@AryanGusain-dev](https://github.com/AryanGusain-dev) |
| **Archee Sinha** | - |
| **Darshita Gupta** | - |
| **Atharv Varshney** | - |

---

## 💡 Problem Statement

Current healthcare is reactive and manual, leading to three primary systemic failures:

- **Ignoring Symptoms:** Chronic patients often overlook subtle symptom links (e.g., a "metallic taste" in Type 2 Diabetes indicating a shift to Type 3), which leads to preventable emergencies.
- **Staff Overload:** Medical professionals are too burdened to provide continuous manual monitoring for every chronic patient at home.
- **Efficiency Loss:** Manual history-taking consumes the majority of a patient's visit, leaving minimal time for actual treatment and consultation.

**VITALS solves this** by deploying AI voice agents that conduct automated health check-ins, extract clinical insights, and generate physician-ready reports.

---

## ✨ Features

- **🤖 AI Voice Agents** – Configurable voice assistants for automated patient calls
- **📊 Real-time Dashboard** – Monitor all patients, calls, and alerts in one view
- **📝 Automated Reports** – AI-generated clinical summaries with risk assessment ([Sample Report](Assets/Anita%20Report.pdf))
- **💬 WhatsApp Integration** – Instant notifications and appointment scheduling
- **🔔 Smart Alerts** – Automated alerts for abnormal vitals or missed medications
- **🩺 Clinical Assessment** – Structured symptom tracking and clinical evaluation

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** + **TypeScript** | UI framework with type safety |
| **Vite** | Fast development & building |
| **Tailwind CSS** + **shadcn/ui** | Styling and component library |
| **TanStack Query** | Server state management |
| **React Router** | Client-side routing |
| **Recharts** | Data visualization |
| **jsPDF** | PDF report generation |

### Backend
| Technology | Purpose |
|------------|---------|
| **Express.js** | REST API server |
| **Supabase** | PostgreSQL database + Auth + Storage |
| **Vapi AI** | Voice call automation & webhooks |
| **Google Gemini API** | AI reasoning & clinical report generation |
| **whatsapp-web.js** | WhatsApp messaging integration |

### RAG System (Python)
| Technology | Purpose |
|------------|---------|
| **LangChain** | LLM orchestration |
| **ChromaDB** | Vector database for medical knowledge |
| **Sentence Transformers** | Text embeddings |
| **Pandas** | Data processing |
| [**MedQuAD Dataset**](https://www.kaggle.com/datasets/rudrik01/medquad) | 16,000+ medical Q&A pairs |

### Testing & DevOps
| Technology | Purpose |
|------------|---------|
| **Vitest** | Unit testing |
| **Playwright** | E2E testing |
| **ESLint** + **TypeScript ESLint** | Code linting |

---

## � Project Structure

```
vitals-heatlhcare/
├── src/                          # React frontend
│   ├── components/               # UI components (shadcn/ui + custom)
│   │   └── ui/                   # Base shadcn components
│   ├── pages/                    # Route pages
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   └── dashboard/            # Dashboard views
│   │       ├── Overview.tsx
│   │       ├── Patients.tsx
│   │       ├── Calls.tsx
│   │       ├── Alerts.tsx
│   │       ├── Agents.tsx
│   │       ├── CreateAgent.tsx
│   │       ├── SimulateCall.tsx
│   │       ├── CallDetail.tsx
│   │       ├── PatientDetail.tsx
│   │       └── MisdiagnosisSolution.tsx
│   ├── hooks/                    # Custom React hooks
│   └── lib/                      # Utilities & helpers
├── server/                       # Express.js API
│   └── index.ts                  # Main server (1,600+ lines)
├── RAG_vitals/                   # Python RAG system
│   ├── rag_pipeline.py           # Main orchestrator
│   ├── cli.py                    # Interactive CLI
│   ├── config.py                 # Configuration
│   ├── loader.py                 # Data ingestion
│   ├── chunker.py                # Text chunking
│   ├── embedder.py               # Vector embeddings
│   ├── retriever.py              # Similarity search
│   ├── augmenter.py              # Context formatting
│   ├── llm.py                    # Gemini integration
│   └── medquad.csv               # Medical dataset
├── Assets/                       # Screenshots & reports
```

---

## � Workflow Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Patient DB    │────▶│   Vapi AI Agent  │────▶│  Voice Call     │
│   (Supabase)    │     │   (Twilio +      │     │  (Deepgram      │
└─────────────────┘     │   Deepgram)      │     │   Nova 3)       │
                        └──────────────────┘     └────────┬────────┘
                                                           │
                    ┌──────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CALL FLOW                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │  Symptom     │──▶│  RAG System  │──▶│  Risk Assessment │   │
│  │  Collection  │   │  (ChromaDB)  │   │  (Gemini API)    │   │
│  └──────────────┘   └──────────────┘   └────────┬─────────┘   │
└───────────────────────────────────────────────────┼─────────────┘
                                                    │
                    ┌───────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OUTPUT GENERATION                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │  PDF Report  │   │  WhatsApp    │   │  Clinical        │   │
│  │  (jsPDF)     │   │  Alert       │   │  Dashboard       │   │
│  └──────────────┘   └──────────────┘   └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## �📸 Application Screenshots

### Landing Page
<p align="center">
  <img src="Assets/Landing%20Page.png" alt="Landing Page" width="800"/>
</p>

### Patient Dashboard, Mock Calls & Clinical Assessment
| Patients Dashboard | Mock Call Testing | Clinical Assessment |
|:------------------:|:-----------------:|:-------------------:|
| <img src="Assets/Patients%20Dashboard.png" width="300"/> | <img src="Assets/Mock%20Call%20for%20testing.png" width="300"/> | <img src="Assets/Clinical%20Assessment%20after%20Call.png" width="300"/> |

### Vitals Extracted & Call Summary
| Vitals Extracted | Call Summary & Transcripts |
|:----------------:|:--------------------------:|
| <img src="Assets/Vitals%20Extracted.png" width="400"/> | <img src="Assets/Call%20Summary%20and%20Transcripts.png" width="400"/> |

### Edit Report & WhatsApp Appointment
| Edit Report (Natural Language) | WhatsApp Appointment |
|:------------------------------:|:--------------------:|
| <img src="Assets/Edit%20Report%20in%20Natural%20Language%20Prompt.png" width="400"/> | <img src="Assets/Whatsapp%20Message%20Sent%20with%20Appointment%20Scheduled.png" width="400"/> |

### 📄 Sample Generated Report

The system generates physician-ready PDF reports after each call. View a sample report:

**[📋 Anita Report.pdf](Assets/Anita%20Report.pdf)**

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and **npm**
- **Python** 3.10+ (for RAG system)
- **Git**

### 1. Clone & Install

```bash
git clone https://github.com/aryan-saini-dev/vitals-heatlhcare.git
cd vitals-heatlhcare
npm install
```

### 2. Supabase Database Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Dashboard** → **SQL Editor** → **New Query**
3. Copy and paste the contents of [`Supabase Schema/schema.sql`](Supabase%20Schema/schema.sql)
4. Click **Run** to create all tables (patients, agents, alerts, activities, calls)

**Schema includes:**
- **patients** – Patient profiles with medical history, medications, appointments
- **agents** – AI voice agent configurations
- **alerts** – System alerts for abnormal vitals
- **activities** – Call/alert/update logs
- **calls** – Call transcripts, summaries, and vitals data

### 3. Fill Dummy Data (Optional)

To populate your database with sample patients and data:

1. **Seed via SQL:** Run the fake data seeder script
   ```bash
   npm run seed:fake-calls
   ```

2. **Or insert manually via Supabase UI:**
   - Go to **Table Editor** → **patients** → **Insert Row**
   - Add sample patients with fields: `name`, `condition`, `contact_number`, `medical_history[]`

### 4. Environment Setup

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

**Required environment variables:**

```env
# Supabase (Database + Auth + Storage)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini (AI)
VITE_GEMINI_API_KEY=your-gemini-api-key

# Vapi AI (Voice Calls)
VITE_VAPI_PUBLIC_KEY=your-vapi-public-key
VITE_VAPI_AGENT_ID=your-agent-id
VAPI_API_KEY=your-vapi-api-key
VAPI_ASSISTANT_ID=your-assistant-id
VAPI_PHONE_NUMBER_ID=your-phone-number-id

# RAG Webhook (optional)
rag_query=https://your-rag-webhook-url

# Server
PORT=4000
```

### 5. Run Development Server

Start both API and frontend concurrently:

```bash
npm run dev
```

- **Frontend:** http://localhost:3001
- **API Server:** http://localhost:4000

### 6. Run RAG System (Optional)

For the standalone medical Q&A CLI:

```bash
cd RAG_vitals

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set API key
set GEMINI_API_KEY=your-key        # Windows
export GEMINI_API_KEY=your-key     # macOS/Linux

# Run interactive CLI
python cli.py
```

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npx playwright test
```

---

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API + Frontend concurrently |
| `npm run dev:web` | Start only Vite frontend |
| `npm run dev:server` | Start only Express API |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run seed:fake-calls` | Generate fake call data |
| `npm run free:dev-ports` | Kill processes on dev ports |

---

## 🔗 API Keys Setup Guide

| Service | How to Get Keys |
|---------|-----------------|
| **Supabase** | Create project at [supabase.com](https://supabase.com) → Project Settings → API |
| **Gemini** | Get API key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| **Vapi** | Sign up at [vapi.ai](https://vapi.ai) → Dashboard → API Keys & Assistants |
| **MedQuAD Dataset** | Download from [Kaggle](https://www.kaggle.com/datasets/rudrik01/medquad) for RAG system |

---

## ⚙️ Vapi Configuration Notes

For optimal voice call performance, configure your Vapi assistant with:

1. **Twilio Integration** – Connect your Twilio account to Vapi for phone number provisioning and call handling
2. **Deepgram Nova 3** – Use Deepgram's Nova 3 model for multilingual voice recognition and natural-sounding responses
3. **RAG Connection** – Link your Vapi assistant webhook to the RAG system endpoint for enhanced symptom recognition and medical knowledge retrieval

---

## 🔮 Future Scope

- **🚑 Ambulance Calling** – Automatic emergency service dispatch when conversations escalate to critical scenarios
- **🔒 Privacy-First Architecture** – De-identification layer or local LLM deployment for patient data protection
- **🏥 Hospital Services Integration** – Direct integration with hospital systems for medicine dosage tracking, appointment scheduling, and EHR synchronization

---