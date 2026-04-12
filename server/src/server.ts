import http from "http";
import { createRequire } from "module";
import { WebSocketServer } from "ws";
import { PORT } from "./config/env.js";
import { initializeWhatsApp } from "./services/whatsapp.service.js";
import { wsClients } from "./services/websocket.service.js";
import app from "./app.js";

// ─── Boot ────────────────────────────────────────────────────────────────────

try {
  const nodeRequire = createRequire(import.meta.url);
  const expressVer = nodeRequire("express/package.json").version;
  console.log("[Server] boot Vitals API — Express", expressVer);
} catch {
  console.log("[Server] boot Vitals API");
}

// Initialize WhatsApp client (non-blocking)
initializeWhatsApp();

// ─── HTTP Server + WebSocket ─────────────────────────────────────────────────

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: "/api/ws" });
wss.on("connection", (ws) => {
  console.log("[WebSocket] Client connected for report exports.");
  wsClients.add(ws);
  ws.on("close", () => wsClients.delete(ws));
  ws.on("error", () => wsClients.delete(ws));
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[Server] Port ${PORT} is already in use — the API did not start.`);
    console.error("[Server] Another `npm run dev` / `tsx server` may still be running, or another app owns this port.");
    console.error(`[Server] Free it:  npm run free:api-port`);
    console.error(`[Server] Or use another port in .env.local — set both:\n  PORT=4001\n  VITE_DEV_API_PORT=4001`);
    process.exit(1);
  }
  console.error("[Server] HTTP server error:", err);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`[Server] listening on http://127.0.0.1:${PORT} (GET /api/calls/list — call list)`);
});

server.on("close", () => {
  console.log("[Server] http server closed");
});

// ─── Process Lifecycle ───────────────────────────────────────────────────────

process.on("SIGINT", () => {
  console.log("[Server] SIGINT received, shutting down...");
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  console.log("[Server] SIGTERM received, shutting down...");
  server.close(() => process.exit(0));
});

process.on("uncaughtException", (err) => {
  console.error("[Server] uncaughtException:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Server] unhandledRejection:", reason);
});

// Keep process alive in environments that auto-close stdin/event loop.
process.stdin.resume();
