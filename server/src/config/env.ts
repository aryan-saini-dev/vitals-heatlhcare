import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..", "..");

// Load env from project root (not cwd) so `npm run dev:server` always sees VITE_* vars.
dotenv.config({ path: path.join(projectRoot, ".env") });
dotenv.config({ path: path.join(projectRoot, ".env.local") });

export const PORT = Number(process.env.PORT || 4000);
export const REPORTS_BUCKET = process.env.SUPABASE_REPORTS_BUCKET || "call-reports";

export function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

/** Supabase URL: Vite uses VITE_SUPABASE_URL; allow plain SUPABASE_URL for server-only .env */
export function requireSupabaseUrl(): string {
  const url =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  if (!url) {
    throw new Error(
      "Missing Supabase URL: set VITE_SUPABASE_URL or SUPABASE_URL in .env.local",
    );
  }
  return url;
}
