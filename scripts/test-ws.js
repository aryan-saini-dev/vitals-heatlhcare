import WebSocket from "ws";

console.log("🔌 Connecting to Vitals API WebSocket...");
const ws = new WebSocket("ws://127.0.0.1:4000/api/ws");

ws.on("open", () => {
  console.log("✅ Successfully connected to ws://127.0.0.1:4000/api/ws");
  console.log("⏳ Waiting for reports to be generated...\n");
  console.log("👉 Action Required: Go to your Vitals Dashboard and click 'Regenerate Report' on any call!");
});

ws.on("message", (data) => {
  console.log("\n📦 [NEW EVENT RECEIVED] ────────────────────────────────────────────────────────");
  const parsed = JSON.parse(data.toString());
  console.log(JSON.stringify(parsed, null, 2));
  console.log("──────────────────────────────────────────────────────────────────────────────\n");
});

ws.on("error", (err) => console.error("❌ Error:", err.message));
ws.on("close", () => console.log("🔌 Connection closed."));
