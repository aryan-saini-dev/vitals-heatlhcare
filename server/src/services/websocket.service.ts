import { WebSocket } from "ws";

// ─── WebSocket Client Management ─────────────────────────────────────────────

export const wsClients = new Set<WebSocket>();

export function broadcastReport(callId: string, vitalsData: any) {
  const payloadInfo = JSON.stringify({
    type: "REPORT_GENERATED",
    callId,
    vitals_data: vitalsData 
  });
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payloadInfo);
    }
  }
}
