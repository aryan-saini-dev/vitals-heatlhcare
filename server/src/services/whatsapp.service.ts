import { createRequire } from "module";

const nodeRequire = createRequire(import.meta.url);

// ─── WhatsApp Client ──────────────────────────────────────────────────────────

let WAClient: any;
let LocalAuth: any;
let MessageMedia: any;
let qrcode: any;
let waClient: any = null;
let waReady = false;

export function isWhatsAppReady(): boolean {
  return waReady;
}

export function isWhatsAppInitialized(): boolean {
  return waClient !== null;
}

export function initializeWhatsApp(): void {
  try {
    // whatsapp-web.js is CommonJS — must be loaded via nodeRequire in an ES-module server
    const wweb = nodeRequire("whatsapp-web.js");
    qrcode = nodeRequire("qrcode-terminal");
    WAClient = wweb.Client;
    LocalAuth = wweb.LocalAuth;
    MessageMedia = wweb.MessageMedia;

    waClient = new WAClient({ authStrategy: new LocalAuth({ dataPath: ".wwebjs_auth" }) });
    waClient.on("qr", (qr: string) => {
      console.log("\n[WhatsApp] ====== SCAN QR CODE =====");
      qrcode.generate(qr, { small: true });
      console.log("[WhatsApp] Open WhatsApp → Linked Devices → Link a Device, then scan above.");
    });
    waClient.on("ready", () => {
      waReady = true;
      console.log("[WhatsApp] ✅ Client ready — PDF reports will be auto-sent via WhatsApp.");
    });
    waClient.on("authenticated", () => {
      console.log("[WhatsApp] Authenticated — loading session...");
    });
    waClient.on("auth_failure", (msg: string) => {
      waReady = false;
      console.error("[WhatsApp] ❌ Auth failed:", msg);
    });
    waClient.on("disconnected", (reason: string) => {
      waReady = false;
      console.warn("[WhatsApp] Disconnected:", reason);
    });
    console.log("[WhatsApp] Initializing (Puppeteer/Chromium starting — may take 30-60s on first run)...");
    waClient.initialize().catch((e: any) => {
      console.error("[WhatsApp] initialize() threw:", e?.message || e);
    });
  } catch (waInitErr: any) {
    console.error("[WhatsApp] ❌ Init failed (non-fatal):", waInitErr?.message || waInitErr);
    console.warn("[WhatsApp] WhatsApp PDF delivery disabled. Manual 'Send on WhatsApp' button will return 503.");
  }
}

/**
 * Send a PDF buffer as a WhatsApp document message.
 * @param toNumber  E.164 phone number, e.g. "+917982404800"
 * @param pdfBuffer Raw PDF bytes
 * @param filename  Filename shown to the recipient
 * @param caption   Caption / text message to accompany the file
 */
export async function sendWhatsappPdf(
  toNumber: string,
  pdfBuffer: Buffer,
  filename: string,
  caption: string,
): Promise<void> {
  if (!waReady || !waClient) {
    console.warn("[WhatsApp] Client not ready — skipping PDF send to", toNumber);
    return;
  }
  // WhatsApp expects number without spaces/dashes, with country code, no "+"
  const chatId = toNumber.replace(/\s+/g, "").replace(/^\+/, "") + "@c.us";
  const base64Data = pdfBuffer.toString("base64");
  const media = new MessageMedia("application/pdf", base64Data, filename);
  await waClient.sendMessage(chatId, media, { caption });
  console.log("[WhatsApp] ✅ PDF sent to", chatId);
}

/**
 * Send a separate distinct text message via WhatsApp.
 * @param toNumber E.164 phone number
 * @param message String message to send
 */
export async function sendWhatsappText(
  toNumber: string,
  message: string,
): Promise<void> {
  if (!waReady || !waClient) return;
  const chatId = toNumber.replace(/\s+/g, "").replace(/^\+/, "") + "@c.us";
  await waClient.sendMessage(chatId, message);
  console.log("[WhatsApp] ✅ Text sent to", chatId);
}
