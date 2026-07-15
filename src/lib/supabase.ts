import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-vitals-project.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables. Supabase will default to placeholder endpoints."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
