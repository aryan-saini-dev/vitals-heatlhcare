# Target Architecture & Efficiency Overhaul: Vitals Healthcare

This plan outlines the architectural shifts required to elevate the newly modularized project into a highly efficient, secure, and resilient enterprise-grade application.

## User Review Required

> [!WARNING]
> **Data Flow Consolidation**
> The biggest shift involves moving **all** external communications (Database, LLMs) to the backend. The frontend will lose direct access to Supabase and Gemini APIs. This guarantees security but requires rewriting frontend data fetching hooks. Please review this constraint before proceeding.

## 1. Security & Security Architecture
In an industry-level application, especially healthcare, exposing external keys and database access direct to the browser is a massive security risk.

### Proposed Changes:
- **Remove Frontend LLM Integration:** Completely strip frontend Gemini integration (`src/services/gemini.ts`). The frontend should not have `VITE_GEMINI_API_KEY`. All chat sessions and report generations must happen on the backend via secured endpoints.
- **Backend-For-Frontend (BFF) Pattern:** Instead of the frontend directly querying Supabase tables via `supabase-js`, the backend will act as the gatekeeper. The frontend will make REST or TRPC calls to the Express app, which then performs DB actions utilizing its Service Role (or bounded user roles).
- **Remove Row Level Security Reliance:** While RLS is great, relying heavily on it from the client can lead to data leaks if misconfigured. The backend will enforce business rules.

## 2. Resilience, Scaling & Async Processing
Currently, the application processes heavy workloads (PDF generation, LLM parsing, WhatsApp messaging) synchronously during webhook lifecycles or HTTP requests. If an exception occurs or an API crashes, the data is lost.

### Proposed Changes:
- **Introduce a Message Queue (BullMQ + Redis):** Heavy tasks (Report Generation, PDF Compilation, WhatsApp Delivery) shouldn't block HTTP responses. Webhooks will simply ingest data and emit events to a queue. Worker processes will pick up these jobs, process them, and retry upon failure.
- **Idempotency Keys:** Ensure Vapi webhooks and retry attempts don't create duplicate calls or alerts.

## 3. Frontend Efficiency & State Management
While `React Context` handles basic state, it is synchronous and inefficient for complex server state.

### Proposed Changes:
- **Strict Server State with React Query (@tanstack/react-query):** Enforce usage of React Query for all data fetching (Calls, Alerts, Patients). This provides background refetching, aggressive caching, optimistic UI updates, and eliminates race conditions.
- **Virtualization:** For long lists (like call logs or transcript streams), implement virtualization (`@tanstack/react-virtual`) so the DOM isn't overloaded.
- **WebSocket Refinements:** Current WebSocket implementation works, but switching to something like `Socket.io` or `Supabase Realtime` natively ensures automatic reconnections and multiplexing.

## 4. Code Quality & Type strictness

### Proposed Changes:
- **Eliminate `any` Data Types:** Use `Zod` (already in `package.json`) to validate **all** incoming webhooks, LLM outputs, and internal API requests. Strict interfaces will replace implicit typing.
- **Supabase Type Generation:** Generate TypeScript interfaces directly from the PostgreSQL schema to ensure the application breaks at compile time if a DB column changes, not at runtime.
- **Structured Logging:** Replace `console.log` with a structured logger like `Pino`. This ensures logs can be ingested by Datadog/AWS Cloudwatch.

## 5. Execution Roadmap

If approved, the implementation will be executed in the following phases:

**Phase 1: Backend Fortification**
1. Add strict `Zod` DTOs for routes.
2. Replace frontend `gemini.ts` with strict backend endpoints.
3. Setup `BullMQ` (or an in-memory queue simulation if Redis isn't immediately available) for async job processing.

**Phase 2: Data Flow Migration (BFF)**
1. Move remaining client-side Supabase queries to backend controllers.
2. Update frontend to use `React Query` exclusively against the new backend endpoints.

**Phase 3: Production Readiness**
1. Implement global error handlers and a structured logger.
2. Add Rate Limiting (`express-rate-limit`) to prevent abuse.

## Open Questions

> [!IMPORTANT]
> 1. **Redis Requirement:** Implementing a proper job queue requires Redis. Do you have a Redis instance available (e.g., Upstash, local Docker), or should I construct an in-memory application-level queue for now?
> 2. **Authentication Flow:** Should we keep Supabase Auth handling the JWTs directly on the client, and just pass the JWTs to our backend? (Standard practice and recommended).

## Verification Plan
- Manual audit of browser network tabs to ensure no direct connections to `api.vapi.ai` or `generativelanguage.googleapis.com` originate from the client.
- Trigger intentional LLM failures in background jobs to verify the queue successfully retries and eventually updates the dashboard state.
