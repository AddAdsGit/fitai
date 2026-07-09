import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "⚠️ Supabase URL or Anon Key is missing. FitAI is running in local Demo Mode. " +
      "Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local to activate the database sync."
  );
}

// Initialize Supabase client. If keys are missing, we pass empty strings to avoid crashing.
// The app will check isSupabaseConfigured before making any calls.
export const supabase = createClient(
  supabaseUrl || "https://placeholder-project.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
