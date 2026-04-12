# Vitals Healthcare — Modularization Walkthrough

## Overview

The monolithic `server/index.ts` (2,019 lines / 78 KB) was decomposed into **17 focused modules** following a standard Express layered architecture. The frontend `src/lib/` "junk drawer" was reorganized into dedicated `contexts/`, `services/`, `utils/`, and `hooks/` directories. **Zero business logic was changed** — only file boundaries were moved.

---

## New Project Structure

```
vitals-heatlhcare/
├── server/
│   ├── index.ts                          ← thin entry point (re-exports server.ts)
│   ├── migrations/
│   │   └── add_phone_number.sql          ← DB migration scripts
│   └── src/
│       ├── server.ts                     ← HTTP server, WebSocket, process lifecycle
│       ├── app.ts                        ← Express config, middleware, route mounting
│       ├── config/
│       │   └── env.ts                    ← environment variable loading & validation
│       ├── middlewares/
│       │   └── auth.middleware.ts         ← Supabase JWT auth validation
│       ├── routes/
│       │   ├── health.routes.ts          ← GET /health, /api/ping, /api/debug/*
│       │   ├── whatsapp.routes.ts        ← GET/POST /api/whatsapp/*
│       │   ├── vapi.routes.ts            ← GET/POST /api/vapi/*
│       │   ├── calls.routes.ts           ← GET/POST /api/calls/*
│       │   └── alerts.routes.ts          ← GET /api/alerts
│       ├── services/
│       │   ├── whatsapp.service.ts       ← WhatsApp Web.js init, QR, PDF/text send
│       │   ├── llm.service.ts            ← Gemini transcript cleaning & report gen
│       │   ├── pdf.service.ts            ← PDFKit clinical report generation
│       │   ├── vapi.service.ts           ← Vapi data extraction & transcript parsing
│       │   ├── websocket.service.ts      ← WS client set & broadcast
│       │   └── call-persist.service.ts   ← call + alert DB persistence orchestration
│       └── utils/
│           └── helpers.ts                ← types, normalizers, pure utility functions
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx               ← React auth provider (NEW location)
│   ├── services/
│   │   ├── api.ts                        ← API URL builder (NEW location)
│   │   ├── gemini.ts                     ← Frontend Gemini integration (NEW location)
│   │   └── supabase.ts                   ← Supabase client singleton (NEW location)
│   ├── utils/
│   │   └── renderUtils.ts               ← Safe value renderer (NEW location)
│   ├── hooks/
│   │   ├── useSpeech.ts                  ← Speech recognition hook (NEW location)
│   │   ├── use-mobile.tsx                ← Mobile detection hook (unchanged)
│   │   └── use-toast.ts                  ← Toast notification hook (unchanged)
│   ├── lib/
│   │   ├── utils.ts                      ← cn() helper (KEPT — shadcn convention)
│   │   ├── AuthContext.tsx               ← re-export shim → contexts/AuthContext
│   │   ├── api.ts                        ← re-export shim → services/api
│   │   ├── gemini.ts                     ← re-export shim → services/gemini
│   │   ├── supabase.ts                   ← re-export shim → services/supabase
│   │   ├── renderUtils.ts               ← re-export shim → utils/renderUtils
│   │   └── useSpeech.ts                  ← re-export shim → hooks/useSpeech
│   ├── components/                       ← (unchanged)
│   ├── pages/                            ← (unchanged)
│   └── ...
├── RAG_vitals/                           ← (untouched per request)
├── Supabase Schema/                      ← (untouched per request)
├── Whatsapp moderator/                   ← (untouched per request)
├── Assets/                               ← (untouched per request)
└── ...config files...
```

---

## Backend — File-by-File Breakdown

### Entry & Lifecycle

| File | Role |
|---|---|
| [index.ts](file:///c:/Users/Aryan%20Gusain/OneDrive/Desktop/Dummy/Projects/vitals-heatlhcare/server/index.ts) | Thin entry point — just imports `src/server.ts`. Script target for `npm run dev:server`. |
| [server.ts](file:///c:/Users/Aryan%20Gusain/OneDrive/Desktop/Dummy/Projects/vitals-heatlhcare/server/src/server.ts) | Creates the HTTP server, attaches WebSocket server on `/api/ws`, initializes WhatsApp, handles `SIGINT`/`SIGTERM` and uncaught errors. |
| [app.ts](file:///c:/Users/Aryan%20Gusain/OneDrive/Desktop/Dummy/Projects/vitals-heatlhcare/server/src/app.ts) | Configures Express (`express.json`, `cors`), mounts all route modules, defines the 404 catch-all. |

### Configuration

| File | Role |
|---|---|
| [env.ts](file:///c:/Users/Aryan%20Gusain/OneDrive/Desktop/Dummy/Projects/vitals-heatlhcare/server/src/config/env.ts) | Loads `.env` / `.env.local` via dotenv. Exports `PORT`, `REPORTS_BUCKET`, `requireEnv()`, `requireSupabaseUrl()`. Single source of truth for all env vars. |

### Middleware

| File | Role |
|---|---|
| [auth.middleware.ts](file:///c:/Users/Aryan%20Gusain/OneDrive/Desktop/Dummy/Projects/vitals-heatlhcare/server/src/middlewares/auth.middleware.ts) | `authenticateRequest(token)` — validates a Supabase JWT and returns `{ userId, supabase, userEmail }`. Also exports `requireAuth` Express middleware for use in protected routes. |

### Routes (HTTP Request Handlers)

| File | Endpoints | Description |
|---|---|---|
| [health.routes.ts](file:///c:/Users/Aryan%20Gusain/OneDrive/Desktop/Dummy/Projects/vitals-heatlhcare/server/src/routes/health.routes.ts) | `GET /health`, `GET /api/ping`, `GET /api/debug/vapi-config` | Liveness probes and debug config inspection. |
| [whatsapp.routes.ts](file:///c:/Users/Aryan%20Gusain/OneDrive/Desktop/Dummy/Projects/vitals-heatlhcare/server/src/routes/whatsapp.routes.ts) | `GET /api/whatsapp/status`, `POST /api/whatsapp/send-report/:callId` | Check WhatsApp readiness; manually trigger PDF delivery to a patient's WhatsApp. |
| [vapi.routes.ts](file:///c:/Users/Aryan%20Gusain/OneDrive/Desktop/Dummy/Projects/vitals-heatlhcare/server/src/routes/vapi.routes.ts) | `GET /api/vapi/call/:callId`, `GET /api/vapi/call/:callId/transcript`, `POST /api/vapi/outbound-call`, `POST /api/vapi/outbound-call/:callId/hangup`, `POST /api/vapi/sync-call`, `POST /api/vapi/webhook` | Vapi voice-call lifecycle: initiate calls, poll status, fetch transcripts, sync finished calls, receive Vapi webhooks. |
| [calls.routes.ts](file:///c:/Users/Aryan%20Gusain/OneDrive/Desktop/Dummy/Projects/vitals-heatlhcare/server/src/routes/calls.routes.ts) | `GET /api/calls/list`, `GET /api/calls/:callId/detail`, `GET /api/calls/:callId/report/download`, `POST /api/calls/:callId/decision`, `POST /api/calls/:callId/generate-report` | Call CRUD, PDF report download, doctor approve/deny, on-demand AI report generation pipeline. |
| [alerts.routes.ts](file:///c:/Users/Aryan%20Gusain/OneDrive/Desktop/Dummy/Projects/vitals-heatlhcare/server/src/routes/alerts.routes.ts) | `GET /api/alerts` | List clinical alerts with enriched patient/agent names and nearest matching call. |

### Services (Domain Business Logic)

| File | Role |
|---|---|
| [llm.service.ts](file:///c:/Users/Aryan%20Gusain/OneDrive/Desktop/Dummy/Projects/vitals-heatlhcare/server/src/services/llm.service.ts) | Gemini 2.5 Flash interaction: `cleanTranscriptToEnglish()` translates & cleans raw transcripts; `generateStructuredReport()` produces structured clinical JSON; `generateDoctorSummaryServer()` generates webhook-time summaries. |
| [pdf.service.ts](file:///c:/Users/Aryan%20Gusain/OneDrive/Desktop/Dummy/Projects/vitals-heatlhcare/server/src/services/pdf.service.ts) | `generateReportPdfBuffer()` — builds a full A4 clinical PDF report using PDFKit from a `ReportData` object, including patient info, symptoms, vitals, scheduling, and transcript excerpt. |
| [vapi.service.ts](file:///c:/Users/Aryan%20Gusain/OneDrive/Desktop/Dummy/Projects/vitals-heatlhcare/server/src/services/vapi.service.ts) | Vapi payload normalization: unwraps nested response shapes, extracts metadata (patient_id, agent_id, docuuid), builds transcript text from multiple Vapi message formats, extracts call duration. Also `detectAssistantMisconfig()` for proactive error prevention. |
| [whatsapp.service.ts](file:///c:/Users/Aryan%20Gusain/OneDrive/Desktop/Dummy/Projects/vitals-heatlhcare/server/src/services/whatsapp.service.ts) | WhatsApp Web.js lifecycle: `initializeWhatsApp()` boots Puppeteer/Chromium, handles QR, auth, disconnect. `sendWhatsappPdf()` and `sendWhatsappText()` deliver documents and messages. |
| [websocket.service.ts](file:///c:/Users/Aryan%20Gusain/OneDrive/Desktop/Dummy/Projects/vitals-heatlhcare/server/src/services/websocket.service.ts) | Manages connected WS clients set and `broadcastReport()` which pushes `REPORT_GENERATED` events to all connected frontends. |
| [call-persist.service.ts](file:///c:/Users/Aryan%20Gusain/OneDrive/Desktop/Dummy/Projects/vitals-heatlhcare/server/src/services/call-persist.service.ts) | `persistCallAndAlertAfterAnalysis()` — orchestrates the full post-analysis flow: normalize report → generate PDF → upload to Supabase Storage → send WhatsApp → insert call record → insert alert → broadcast via WS. |

### Utilities

| File | Role |
|---|---|
| [helpers.ts](file:///c:/Users/Aryan%20Gusain/OneDrive/Desktop/Dummy/Projects/vitals-heatlhcare/server/src/utils/helpers.ts) | Pure functions & types: `normalizeE164()`, `parseVapiError()`, `parseJsonFromModelText()`, `parseFutureDate()`, `generateSchedules()`, `safeString()`, `ReportData` type, `normalizeReportData()`, transcript utilities (`extractSymptomsFromPatientLines`, `mergeSymptomsFromTranscript`, `effectiveCallTranscript`). |

---

## Frontend — File-by-File Breakdown

### New Canonical Locations

| New Path | Old Path | Purpose |
|---|---|---|
| `src/contexts/AuthContext.tsx` | `src/lib/AuthContext.tsx` | React context provider for Supabase authentication state (`user`, `session`, `isLoading`, `signOut`). |
| `src/services/supabase.ts` | `src/lib/supabase.ts` | Singleton Supabase JS client initialized from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. |
| `src/services/api.ts` | `src/lib/api.ts` | `apiUrl()` helper that resolves API paths to the correct origin (dev proxy vs production). |
| `src/services/gemini.ts` | `src/lib/gemini.ts` | Frontend Gemini integration: `createPatientChatSession()` for live agent chat, `generateDoctorSummary()` for client-side transcript analysis. |
| `src/utils/renderUtils.ts` | `src/lib/renderUtils.ts` | `safeRender()` — safely converts any value (strings, arrays, objects) to display strings, avoiding `[object Object]`. |
| `src/hooks/useSpeech.ts` | `src/lib/useSpeech.ts` | `useSpeech()` hook — wraps the Web Speech API for recognition + synthesis with VAD (voice activity detection) silence gating. |

### Backward-Compatible Shims

The old `src/lib/` files now contain single-line re-exports pointing to the new locations. This ensures:
- All 40+ `shadcn/ui` components that import `@/lib/utils` continue working with zero changes.
- All existing page/component imports (`@/lib/AuthContext`, `@/lib/api`, etc.) resolve correctly through the shims.

### Unchanged Files

| Directory | Notes |
|---|---|
| `src/lib/utils.ts` | **Kept in place** — this is the `cn()` class merger required by shadcn/ui convention. |
| `src/components/ui/*` | 49 shadcn/ui components — untouched. |
| `src/components/dashboard/*` | `DashboardLayout.tsx` — untouched. |
| `src/components/*.tsx` | Landing page sections (`HeroSection`, `FeaturesSection`, etc.) — untouched. |
| `src/pages/*` | All page components — untouched. |
| `src/hooks/use-mobile.tsx`, `use-toast.ts` | Existing hooks — untouched. |

---

## Verification Results

| Check | Result |
|---|---|
| `npx vite build` (frontend) | ✅ Built in 6.12s — 2,162 modules transformed |
| `npx tsx server/index.ts` (backend) | ✅ Express 4.21.2 started on port 4000 |
| `GET /health` | ✅ `{"ok":true}` |
| `GET /api/ping` | ✅ `{"ok":true,"service":"vitals-api"}` |
| WhatsApp client | ✅ Authenticated and ready |
| `npm run dev` script | ✅ Works unchanged — entry point `server/index.ts` is preserved |

---

## What Changed vs What Didn't

> [!IMPORTANT]
> **Zero business logic was modified.** Every function, prompt, API call, database query, and WhatsApp message is byte-for-byte identical to the original. Only file boundaries and import paths changed.

### Changed
- `server/index.ts`: 2,019 lines → 12 lines (thin re-export)  
- 17 new backend modules created under `server/src/`
- 6 frontend files relocated from `src/lib/` to proper directories
- 6 re-export shims created in `src/lib/` for backward compatibility

### Not Changed
- All `src/pages/`, `src/components/`, `src/hooks/use-*.ts` files
- `package.json` scripts, `vite.config.ts`, `tsconfig.*.json`
- `RAG_vitals/`, `Supabase Schema/`, `Whatsapp moderator/`, `Assets/`
