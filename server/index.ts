/**
 * Entry point for the Vitals API server.
 *
 * All application logic has been modularized into:
 *   server/src/config/     — environment configuration
 *   server/src/middlewares/ — Express middlewares (auth)
 *   server/src/routes/     — API route definitions
 *   server/src/services/   — business logic (LLM, PDF, Vapi, WhatsApp, WebSocket)
 *   server/src/utils/      — pure utility functions & types
 *
 * This file is kept as the npm script entry point.
 */
import "./src/server.js";
