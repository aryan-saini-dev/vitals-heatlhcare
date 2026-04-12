import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health.routes.js";
import whatsappRoutes from "./routes/whatsapp.routes.js";
import vapiRoutes from "./routes/vapi.routes.js";
import callsRoutes from "./routes/calls.routes.js";
import alertsRoutes from "./routes/alerts.routes.js";

// ─── Express Application Setup ──────────────────────────────────────────────

const app = express();

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));

// ─── Mount Routes ────────────────────────────────────────────────────────────
app.use(healthRoutes);
app.use(whatsappRoutes);
app.use(vapiRoutes);
app.use(callsRoutes);
app.use(alertsRoutes);

// ─── 404 Catch-all ───────────────────────────────────────────────────────────
app.use((req, res) => {
  if (String(req.originalUrl || "").startsWith("/api")) {
    console.warn("[Server] API 404:", req.method, req.originalUrl);
  }
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

export default app;
